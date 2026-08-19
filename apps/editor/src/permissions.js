// UI-only hint, deliberately duplicating storage.rules' isCanPublish
// allowlist — keep the two in sync by hand, there's no shared source of
// truth between client code and Storage rules. A stale/wrong list here
// only produces a confusing disabled button; the real enforcement is
// storage.rules, not this file.
const CAN_PUBLISH_EMAILS = ["fmolinerozelaya@gmail.com"];

export function canPublish(user) {
  return Boolean(user?.email && CAN_PUBLISH_EMAILS.includes(user.email));
}
