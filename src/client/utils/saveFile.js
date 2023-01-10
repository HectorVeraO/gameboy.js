export const saveFile = (
  {
    file: {
      prefix,
      extension,
      mimeType,
      content,
    }
  }
) => {
  const blob = new Blob([content], { type: mimeType });
  const ts = Math.floor(Date.now() / 1000);
  const filename = `${prefix}-${ts}.${extension}`;
  const anchor = document.createElement('a');
  anchor.hidden = true;
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  document.body.appendChild(anchor)
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  document.body.removeChild(anchor);
};
