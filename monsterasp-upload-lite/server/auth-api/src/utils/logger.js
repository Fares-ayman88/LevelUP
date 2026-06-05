const formatMeta = (meta) => {
  if (!meta) return '';
  if (meta instanceof Error) return ` ${meta.stack || meta.message}`;
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
};

export const logger = {
  info(message, meta) {
    console.log(`[INFO] ${message}${formatMeta(meta)}`);
  },
  warn(message, meta) {
    console.warn(`[WARN] ${message}${formatMeta(meta)}`);
  },
  error(message, meta) {
    console.error(`[ERROR] ${message}${formatMeta(meta)}`);
  },
};
