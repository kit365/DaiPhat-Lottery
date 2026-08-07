import { Title } from 'daiphat-fe';

// The floor card's auto-generated crash-safe prop uses an empty string for
// `title` (required, typed `string`), rendering genuinely blank rather than
// the deliberate "not yet authored" placeholder (the root has an element,
// just with no text -- the floor-card empty-root check doesn't catch that).
// One realistic example, not a full authored gallery (see NOTES.md).
export const Default = () => <Title title="Danh sách vé số" />;
