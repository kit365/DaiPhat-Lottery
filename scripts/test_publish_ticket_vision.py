import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('publish', Path(__file__).with_name('publish_ticket_vision.py'))
publish = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publish)


class PublishSafetyTests(unittest.TestCase):
    def test_context_excludes_secrets_fixtures_and_generated_data(self):
        for name in ['infra/.env', 'infra/.env.prod', 'services/ticket-vision/fixtures/ticket.jpg',
                     'services/ticket-vision/test_scan_router.py', 'infra/__pycache__/config.pyc',
                     'services/ticket-vision/models/unreviewed.pt', 'infra/key.pem']:
            self.assertFalse(publish.allowed_source(name), name)
        self.assertTrue(publish.allowed_source('infra/config.py'))
        self.assertTrue(publish.allowed_source('services/ticket-vision/Dockerfile'))

    def test_credential_detection_does_not_print_the_value(self):
        secret = b'gsk_' + b'A' * 40
        with self.assertRaises(RuntimeError) as error:
            publish.check_bytes(secret, 'infra/example.py')
        self.assertNotIn(secret.decode(), str(error.exception))
        publish.check_bytes(b'API_KEY: str = ""', 'infra/config.py')

    def test_docker_hub_pat_is_detected_without_printing_it(self):
        secret = b'dckr_pat_' + b'A' * 30
        with self.assertRaises(RuntimeError) as error:
            publish.check_bytes(secret, 'image config/history')
        self.assertNotIn(secret.decode(), str(error.exception))

    def test_require_raises_an_explicit_runtime_error(self):
        publish.require(True, 'must pass')
        with self.assertRaisesRegex(RuntimeError, 'must fail'):
            publish.require(False, 'must fail')

    def test_release_identity_rejects_tampering(self):
        sha = 'a' * 40
        valid = {
            'commit': sha,
            'repository': publish.DEFAULT_REPOSITORY,
            'tag': 'candidate-' + sha,
            'image': publish.DEFAULT_REPOSITORY + ':candidate-' + sha,
            'platform': 'linux/amd64',
        }
        publish.validate_identity(valid)
        invalid_values = {
            'commit': 'short',
            'repository': 'docker.io/kitops365/other-image',
            'tag': 'candidate-' + ('b' * 40),
            'image': publish.DEFAULT_REPOSITORY + ':latest',
            'platform': 'linux/arm64',
        }
        for field, value in invalid_values.items():
            with self.subTest(field=field):
                tampered = dict(valid)
                tampered[field] = value
                with self.assertRaises(RuntimeError):
                    publish.validate_identity(tampered)

    def test_existing_tag_blocks_publication(self):
        with patch.object(publish, 'check_public'), patch.object(publish, 'registry_manifest', return_value=({}, 'sha256:abc')):
            with self.assertRaisesRegex(RuntimeError, 'already exists'):
                publish.require_absent({'repository': publish.DEFAULT_REPOSITORY, 'tag': 'candidate-abc'})

    def test_network_failure_does_not_mean_tag_is_available(self):
        with patch.object(publish, 'check_public'), patch.object(publish, 'registry_manifest', side_effect=RuntimeError('network')):
            with self.assertRaisesRegex(RuntimeError, 'network'):
                publish.require_absent({'repository': publish.DEFAULT_REPOSITORY, 'tag': 'candidate-abc'})

    def test_only_404_is_treated_as_absent(self):
        for status in [401, 403, 429, 500, 404]:
            error = publish.urllib.error.HTTPError('https://registry.invalid', status, 'error', {}, io.BytesIO())
            with patch.object(publish, 'remote_json', return_value={'token': 'anonymous'}), patch.object(publish.urllib.request, 'urlopen', side_effect=error):
                if status == 404:
                    self.assertIsNone(publish.registry_manifest(publish.DEFAULT_REPOSITORY, 'candidate-test', absent_ok=True))
                else:
                    with self.assertRaises(RuntimeError):
                        publish.registry_manifest(publish.DEFAULT_REPOSITORY, 'candidate-test', absent_ok=True)

    def test_changed_tag_cannot_be_pushed(self):
        state = {'phase': 'verified', 'image_id': 'sha256:original', 'verified_image_id': 'sha256:original',
                 'image': 'repo:tag'}
        with patch.object(publish, 'release', return_value=(Path('/unused'), state)), patch.object(publish, 'require_absent'), patch.object(publish, 'command', return_value='sha256:replacement') as command:
            with self.assertRaisesRegex(RuntimeError, 'changed'):
                publish.push(None)
            self.assertEqual(command.call_count, 1)

    def test_unverified_image_never_pushes(self):
        with patch.object(publish, 'release', return_value=(Path('/unused'), {'image_id': 'sha256:x'})), patch.object(publish, 'command') as command:
            with self.assertRaisesRegex(RuntimeError, 'verification'):
                publish.push(None)
            command.assert_not_called()


if __name__ == '__main__':
    unittest.main()
