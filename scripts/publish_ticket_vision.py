#!/usr/bin/env python3
"""Prepare/build, verify, and explicitly push one public OCR candidate.

No provider credentials, cloud scan, VPS access, or source changes are required.
Only the push subcommand writes to Docker Hub. All Docker targets are exact.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '.local/ocr-publish'
SERVICE = 'services/ticket-vision'
DEFAULT_REPOSITORY = 'docker.io/kitops365/daiphat-ticket-vision'
SOURCE_ROOTS = ('contracts', 'infra', 'libs', SERVICE)
TOKEN_PATTERNS = [
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/]{40,}'),
    re.compile(rb'\bgsk_[A-Za-z0-9]{24,}'),
    re.compile(rb'\bgh[pousr]_[A-Za-z0-9]{30,}'),
    re.compile(rb'\bAKIA[A-Z0-9]{16}\b'),
    re.compile(rb'\bdckr_pat_[A-Za-z0-9_-]{20,}'),
    re.compile(rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}'),
    re.compile(rb'(?i)(?:api[_-]?key|password|client[_-]?secret)\s*[=:]\s*[\x22\x27][A-Za-z0-9_+/=-]{20,}[\x22\x27]'),
]
PUBLIC_FIXTURE_SHA256 = {
    # PyCryptodome's public RSA test vector, shipped in its official wheel.
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Cipher/__pycache__/test_pkcs1_15.cpython-312.pyc':
        '37089df5a1a2638b7e29017c2bad1e9834b76de11265210528f54dcbcd1de36c',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Cipher/test_pkcs1_15.py':
        '9f7ae293bbedfdaf32bd892c9b81679a1d0fe82a480624d77827d98f5602c906',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/test_import_Curve25519.py':
        'bfdaca1da576dfc8ea2bc9c600967383e3585defdfefe6a7f15d7c2b9e9b97be',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/test_import_RSA.py':
        '9ee884deb5c9703349d7b660ed3ff806c93eff2c62850b9e46aa7500a2697e08',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/test_import_DSA.py':
        'd9a5613097b67f8a4d22d08366ca7adc805dc1fc6a8f3042400e1ac6fa9685e8',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/test_import_Curve448.py':
        'b203749cad96095587d575fb82bc575fe1ff20088339284cbdfb9d819634fbb2',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/test_import_ECC.py':
        'c41b3b050c5450bf06a8005806f5fe20488718eefce7a7c13799da3f8c4c3ddf',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/__pycache__/test_import_RSA.cpython-312.pyc':
        '52a8b1bbfe6dc1247ef5af1d80a2bf7bfbc9f96bf0ef59112e1c344eb7a590a8',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/__pycache__/test_import_DSA.cpython-312.pyc':
        '91f014e539560cfacb865f1e6544b7edbf3a6fa62a2e3459f851680c49d93235',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/__pycache__/test_import_Curve448.cpython-312.pyc':
        '41bc1ce243025bb0b19f74ef425f3463831798e11b5788d027ac7116187fc605',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/__pycache__/test_import_Curve25519.cpython-312.pyc':
        'edd8742ab6a097333e5a03a2d4c85038b977d9d025891f2ed1bd5e0b35abe3a0',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/PublicKey/__pycache__/test_import_ECC.cpython-312.pyc':
        '7a87eee3dd2688fd5f94fa29b7369dfba63b96856c2c06ce48827da80e5d7b22',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Protocol/test_ecdh.py':
        '8674342fed4d50b426d8caef411ded6de97d407bc288acfdd2831221e392fc60',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Protocol/__pycache__/test_ecdh.cpython-312.pyc':
        'eb19dee566d858856b5798def29b007f501cc8f275d8fc36fdfa8716d69c2484',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Signature/test_pss.py':
        '012d42139e56f5beb7541a3b32308f790f34b23da248c601b23159631e24924b',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Signature/__pycache__/test_pkcs1_15.cpython-312.pyc':
        '8b4e1491d636a6f23b0a5153727c3a540141f839fde8cb5d3d5dffbcd8a60edb',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Signature/__pycache__/test_pss.cpython-312.pyc':
        '8c54438d049f2d8707b3fe54ed1add415e7353dc1c5d89e4c6114672c107460b',
    'usr/local/lib/python3.12/site-packages/Crypto/SelfTest/Signature/test_pkcs1_15.py':
        'bdb790f946c6555061688e09522d8dcf69bdd7774714d9d2a0f4434a971891ac',
}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def validate_identity(state):
    require(bool(re.fullmatch('[a-f0-9]{40}', state.get('commit', ''))), 'Invalid commit identity')
    require(bool(re.fullmatch(r'docker\.io/[a-z0-9_-]+/daiphat-ticket-vision', state.get('repository', ''))), 'Invalid repository identity')
    require(state.get('tag') == 'candidate-' + state['commit'], 'Invalid candidate tag identity')
    require(state.get('image') == state['repository'] + ':' + state['tag'], 'Invalid image identity')
    require(state.get('platform') == 'linux/amd64', 'Invalid platform identity')


def command(args, *, log=None, timeout=7200):
    if log:
        with Path(log).open('w') as stream:
            result = subprocess.run(args, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT, timeout=timeout)
        if result.returncode:
            raise RuntimeError(f'Command failed ({result.returncode}); see {log}')
        return ''
    result = subprocess.run(args, cwd=ROOT, text=True, capture_output=True, timeout=timeout)
    if result.returncode:
        # Docker commands here never receive tokens as argv.
        raise RuntimeError(f'{args[0]} failed: {result.stderr[-1200:]}')
    return result.stdout.strip()


def digest_file(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save(path, data):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(path)


def remote_json(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def registry_manifest(repository, reference, *, absent_ok=False):
    name = repository.removeprefix('docker.io/')
    # Anonymous pull-scoped token only, kept in memory and never logged.
    token = remote_json('https://auth.docker.io/token?' + urllib.parse.urlencode({
        'service': 'registry.docker.io', 'scope': f'repository:{name}:pull'}))['token']
    request = urllib.request.Request(f'https://registry-1.docker.io/v2/{name}/manifests/{reference}', headers={
        'Authorization': 'Bearer ' + token,
        'Accept': ','.join(['application/vnd.oci.image.index.v1+json',
                           'application/vnd.oci.image.manifest.v1+json',
                           'application/vnd.docker.distribution.manifest.list.v2+json',
                           'application/vnd.docker.distribution.manifest.v2+json'])})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response), response.headers['Docker-Content-Digest']
    except urllib.error.HTTPError as exc:
        if absent_ok and exc.code == 404:
            return None
        raise RuntimeError(f'Registry check failed: HTTP {exc.code}; refusing to treat it as an absent tag') from None


def check_public(repository):
    name = repository.removeprefix('docker.io/')
    info = remote_json(f'https://hub.docker.com/v2/repositories/{name}/')
    if info.get('is_private') is not False or f"{info.get('namespace')}/{info.get('name')}" != name:
        raise RuntimeError('Expected the selected existing PUBLIC Docker Hub repository')


def require_absent(state):
    check_public(state['repository'])
    if registry_manifest(state['repository'], state['tag'], absent_ok=True) is not None:
        raise RuntimeError('Candidate tag already exists. It will not be overwritten.')


def check_bytes(data, location):
    if any(pattern.search(data) for pattern in TOKEN_PATTERNS):
        raise RuntimeError(f'Credential signature found in {location}; value intentionally not printed')


def scan_stream(stream, location):
    tail = b''
    while chunk := stream.read(1024 * 1024):
        data = tail + chunk
        check_bytes(data, location)
        tail = data[-2048:]


def allowed_source(name):
    path = PurePosixPath(name)
    if any(part.startswith('.env') or part in {'.git', '.venv', '__pycache__', '.pytest_cache',
                                              'fixtures', 'tests', 'data', 'build', 'dist', '.cache'} for part in path.parts):
        return False
    if path.name.startswith(('test_', 'conftest')):
        return False
    return path.suffix.lower() in {'.py', '.toml', '.txt', '.md', '.sh'} or path.name in {'Dockerfile', '.dockerignore'}


def source_context(sha, destination, model):
    # git archive is from the selected commit, not the dirty working directory.
    archive = subprocess.check_output(['git', 'archive', sha, 'daiphat-ai'], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(archive)) as source:
        for entry in source:
            if not entry.isfile():
                if entry.issym() or entry.islnk():
                    raise RuntimeError(f'Symlinks are not accepted in publish context: {entry.name}')
                continue
            relative = str(PurePosixPath(entry.name).relative_to('daiphat-ai'))
            if relative != '.dockerignore' and not any(relative.startswith(prefix + '/') for prefix in SOURCE_ROOTS):
                continue
            if not allowed_source(relative):
                continue
            data = source.extractfile(entry).read()
            check_bytes(data, relative)
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            target.chmod(entry.mode & 0o777)
    target = destination / SERVICE / 'models/best.pt'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(model, target)
    return {str(p.relative_to(destination)): digest_file(p) for p in sorted(destination.rglob('*')) if p.is_file()}


def prepare(args):
    sha = command(['git', 'rev-parse', f'{args.ref}^{{commit}}'])
    if not args.model.is_file():
        raise RuntimeError('best.pt is missing')
    state = {'schema': 1, 'commit': sha, 'repository': args.repository, 'tag': 'candidate-' + sha,
             'platform': 'linux/amd64', 'model_sha256': digest_file(args.model), 'phase': 'prepared'}
    state['image'] = state['repository'] + ':' + state['tag']
    require_absent(state)
    output = OUTPUT / sha
    if output.exists():
        raise RuntimeError(f'Existing preparation preserved at {output}; use its build/verify steps')
    output.mkdir(parents=True)
    context = output / 'context'
    context.mkdir()
    state['context_files'] = source_context(sha, context, args.model)
    save(output / 'release.json', state)
    print(output)


def release(args):
    path = args.release.resolve()
    if path.parent != OUTPUT.resolve() or not re.fullmatch('[a-f0-9]{40}', path.name):
        raise RuntimeError('Release directory must be a prepared commit inside .local/ocr-publish')
    state = json.loads((path / 'release.json').read_text())
    validate_identity(state)
    if state['commit'] != path.name or state['tag'] != 'candidate-' + state['commit']:
        raise RuntimeError('Invalid release identity')
    return path, state


def build(args):
    output, state = release(args)
    if state.get('image_id'):
        raise RuntimeError('An image was already built. Reuse it; do not replace the tested artifact.')
    require_absent(state)
    context = output / 'context'
    actual = {str(p.relative_to(context)): digest_file(p) for p in context.rglob('*') if p.is_file()}
    if actual != state['context_files']:
        raise RuntimeError('Prepared context changed; refusing to build')
    if shutil.disk_usage(ROOT).free < 24 * 1024**3:
        raise RuntimeError('At least 24 GiB free disk is required for this full dependency build and layer audit')
    started = time.monotonic()
    command(['docker', 'buildx', 'build', '--platform', state['platform'], '--load',
             '--label', f'org.opencontainers.image.revision={state["commit"]}',
             '--label', f'com.daiphat.yolo.sha256={state["model_sha256"]}',
             '--tag', state['image'], '--file', str(context / SERVICE / 'Dockerfile'), str(context)],
            log=output / 'build.log')
    info = json.loads(command(['docker', 'image', 'inspect', state['image']]))[0]
    state.update(image_id=info['Id'], image_bytes=info['Size'], build_seconds=time.monotonic()-started,
                 phase='built')
    save(output / 'release.json', state)
    print(f'Built {state["image_id"]}; {output}')


def audit_layers(image_id, output, expected_model):
    # Inspect every layer, including files removed by subsequent layers.
    with tempfile.TemporaryDirectory(prefix='ocr-layer-audit-') as temporary:
        archive_path = Path(temporary) / 'image.tar'
        command(['docker', 'image', 'save', '--output', str(archive_path), image_id])
        count = 0
        dependency_files_skipped = 0
        with tarfile.open(archive_path) as archive:
            manifest = json.load(archive.extractfile('manifest.json'))[0]
            config_bytes = archive.extractfile(manifest['Config']).read()
            check_bytes(config_bytes, 'image config/history')
            config_digest = 'sha256:' + hashlib.sha256(config_bytes).hexdigest()
            for layer_name in manifest['Layers']:
                with tarfile.open(fileobj=archive.extractfile(layer_name), mode='r|*') as layer:
                    for member in layer:
                        if not member.isfile():
                            continue
                        name = member.name.removeprefix('./')
                        parts = PurePosixPath(name).parts
                        if name.startswith('usr/local/lib/python3.12/site-packages/'):
                            dependency_files_skipped += 1
                            continue
                        app_area = name.startswith(('app/', 'tmp/', 'root/', 'cache/'))
                        if app_area and any(p.startswith('.env') or p in {'.venv', '.git', '.aws', '.ssh', '.cache'} for p in parts):
                            raise RuntimeError(f'Forbidden file in image layer: {name}')
                        if name == 'app/services/ticket-vision/models/best.pt':
                            if hashlib.file_digest(layer.extractfile(member), 'sha256').hexdigest() != expected_model:
                                raise RuntimeError('Unexpected model in image layer')
                        elif name.startswith('app/') and not allowed_source(name):
                            raise RuntimeError(f'Unexpected application artifact in image: {name}')
                        else:
                            if name in PUBLIC_FIXTURE_SHA256:
                                data = layer.extractfile(member).read()
                                require(hashlib.sha256(data).hexdigest() == PUBLIC_FIXTURE_SHA256[name],
                                        f'Unexpected contents for public fixture: {name}')
                            else:
                                scan_stream(layer.extractfile(member), name)
                        count += 1
        save(output / 'layer-audit.json', {'passed': True, 'checked_files': count,
             'dependency_files_skipped': dependency_files_skipped, 'config_digest': config_digest,
             'scope': 'Credential signature scan of all non-site-packages regular files in all layers; forbidden app/tmp/root/cache artifacts; third-party dependencies are not credential-scanned'})
        return config_digest


def verify(args):
    output, state = release(args)
    state.pop('verified_image_id', None)
    state['phase'] = 'verifying'
    save(output / 'release.json', state)
    image_id = state['image_id']
    info = json.loads(command(['docker', 'image', 'inspect', image_id]))[0]
    require((info['Os'], info['Architecture']) == ('linux', 'amd64'), 'Wrong image platform')
    require(info['Config']['User'] == 'daiphat', 'Expected unprivileged user')
    labels = info['Config'].get('Labels') or {}
    require(labels.get('org.opencontainers.image.revision') == state['commit'], 'Image source label changed')
    require(labels.get('com.daiphat.yolo.sha256') == state['model_sha256'], 'Image model label changed')
    require('--reload' not in info['Config']['Cmd'], 'Reload must be disabled')
    require(info['Config']['Cmd'][-2:] == ['--workers', '1'], 'Expected one worker')
    config_digest = audit_layers(image_id, output, state['model_sha256'])
    name = 'daiphat-ocr-verify-' + uuid.uuid4().hex[:12]
    created = False
    try:
        command(['docker', 'run', '-d', '--name', name, '--platform', 'linux/amd64', '--network', 'none',
                 '--memory', '4g', '--cpus', '2', '-e', 'OMP_NUM_THREADS=2', '-e', 'MKL_NUM_THREADS=2', image_id])
        created = True
        health = "import json,urllib.request,sys; d=json.load(urllib.request.urlopen('http://127.0.0.1:8090/health',timeout=5)); sys.exit(0 if d.get('success') and d.get('data',{}).get('status')=='up' else 1)"
        for attempt in range(30):
            try:
                command(['docker', 'exec', name, 'python', '-c', health], timeout=10)
                break
            except RuntimeError:
                if attempt == 29:
                    raise
                time.sleep(2)
        probe = (
            "import os,hashlib,json,numpy as np; from pathlib import Path; from ultralytics import YOLO; "
            "check=lambda ok,msg: None if ok else (_ for _ in ()).throw(RuntimeError(msg)); "
            "check(os.getuid()!=0,'root process'); "
            "p=Path('/cache/.publish-probe'); p.write_text('ok'); p.unlink(); "
            "w=Path('/app/services/ticket-vision/models/best.pt'); "
            f"check(hashlib.sha256(w.read_bytes()).hexdigest()=='{state['model_sha256']}','model checksum'); "
            "r=YOLO(str(w)).predict(np.zeros((640,640,3),dtype=np.uint8),device='cpu',verbose=False); "
            "check(len(r)==1 and r[0].obb is not None,'OBB inference failed'); print('AMD64 model inference and cache: PASS')")
        command(['docker', 'exec', name, 'python', '-c', probe], log=output / 'runtime.log', timeout=300)
        command(['docker', 'exec', name, 'python', '-m', 'pip', 'freeze'], log=output / 'packages.txt')
    finally:
        if created:
            try:
                command(['docker', 'rm', '-f', name], timeout=30)
            except (RuntimeError, subprocess.SubprocessError):
                print(f'Cleanup incomplete: remove only container {name}', file=sys.stderr)
    state.update(phase='verified', verified_image_id=image_id, verified_config_digest=config_digest)
    state['verification_tool_sha256'] = digest_file(__file__)
    save(output / 'release.json', state)
    print(f'Verified {image_id}. Cloud OCR and Paddle compatibility are not certified.')


def push(args):
    output, state = release(args)
    if state.get('verified_image_id') != state.get('image_id') or state.get('phase') != 'verified':
        raise RuntimeError('Push requires verification of this exact image ID')
    require_absent(state)
    local_id = command(['docker', 'image', 'inspect', state['image'], '--format', '{{.Id}}'])
    if local_id != state['verified_image_id']:
        raise RuntimeError('Local tag changed after verification')
    command(['docker', 'push', state['image']], log=output / 'push.log')
    state['phase'] = 'uploaded'
    save(output / 'release.json', state)
    confirm(args)


def confirm(args):
    # Recoverable read/pull-only post-push check; never uploads or overwrites tags.
    output, state = release(args)
    require(state.get('verified_image_id') == state.get('image_id') and state.get('verified_config_digest'),
            'Confirmation requires an image previously verified locally')
    check_public(state['repository'])
    manifest, digest = registry_manifest(state['repository'], state['tag'])
    if 'manifests' in manifest:
        match = [m for m in manifest['manifests'] if m.get('platform', {}).get('architecture') == 'amd64'
                 and m.get('platform', {}).get('os') == 'linux']
        if len(match) != 1:
            raise RuntimeError('Registry manifest does not have exactly one AMD64 runtime image')
        manifest, _ = registry_manifest(state['repository'], match[0]['digest'])
    if manifest['config']['digest'] != state['verified_config_digest']:
        raise RuntimeError('Registry image differs from verified image')
    state.update(phase='pushed', digest=digest)
    save(output / 'release.json', state)
    # No docker logout or changes to the user's credentials. Empty temporary
    # client config proves public access while using the existing daemon socket.
    endpoint = json.loads(command(['docker', 'context', 'inspect']))[0]['Endpoints']['docker']['Host']
    with tempfile.TemporaryDirectory(prefix='ocr-public-pull-') as config:
        (Path(config) / 'config.json').write_text('{"auths":{}}')
        command(['docker', '--config', config, '--host', endpoint, 'pull', '--platform', 'linux/amd64',
                 state['repository'] + '@' + digest], log=output / 'public-pull.log')
    state['public_pull_verified'] = True
    save(output / 'release.json', state)
    print(state['repository'] + '@' + digest)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'build', 'verify', 'push', 'confirm'])
    parser.add_argument('--repository', default=DEFAULT_REPOSITORY)
    parser.add_argument('--ref', default='HEAD')
    parser.add_argument('--model', type=Path, default=ROOT / 'daiphat-ai' / SERVICE / 'models/best.pt')
    parser.add_argument('--release', type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r'docker\.io/[a-z0-9_-]+/daiphat-ticket-vision', args.repository):
        parser.error('Expected docker.io/<namespace>/daiphat-ticket-vision')
    if args.action != 'prepare' and args.release is None:
        parser.error('--release is required')
    try:
        globals()[args.action](args)
    except (RuntimeError, AssertionError, OSError, KeyError, subprocess.SubprocessError, urllib.error.URLError) as exc:
        print(f'STOP: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
