import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

export const getExtensions = (placeholder?: string) => [
    TextStyleKit,
    StarterKit,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
        isAllowedUri: (url, ctx) => {
            try {
                const parsedUrl = url.includes(':') ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`)
                if (!ctx.defaultValidate(parsedUrl.href)) {
                    return false
                }
                const disallowedProtocols = ['ftp', 'file', 'mailto']
                const protocol = parsedUrl.protocol.replace(':', '')
                if (disallowedProtocols.includes(protocol)) {
                    return false
                }
                const allowedProtocols = ctx.protocols.map(p => (typeof p === 'string' ? p : p.scheme))
                if (!allowedProtocols.includes(protocol)) {
                    return false
                }
                const disallowedDomains = ['example-phishing.com', 'malicious-site.net']
                const domain = parsedUrl.hostname
                if (disallowedDomains.includes(domain)) {
                    return false
                }
                return true
            } catch {
                return false
            }
        },
        shouldAutoLink: url => {
            try {
                const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`)
                const disallowedDomains = ['example-no-autolink.com', 'another-no-autolink.com']
                const domain = parsedUrl.hostname
                return !disallowedDomains.includes(domain)
            } catch {
                return false
            }
        },
    }),
    Image.configure({
        inline: true,
        allowBase64: true,
    }),
    Placeholder.configure({
        placeholder: placeholder || 'Hãy viết điều gì đó tuyệt vời...',
    }),
]
