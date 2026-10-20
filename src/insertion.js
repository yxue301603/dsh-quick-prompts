/** Insert only the selected prompt through DSH's undoable, revision-guarded API. */
export function insertPrompt(actions, text, span) {
  if (!actions || typeof actions.insertText !== 'function' || typeof actions.captureInsertion !== 'function') throw new Error('unsupported');
  const target = span ?? actions.captureInsertion();
  if (actions.insertText(text, target) !== true) throw new Error('draftChanged');
  // Insertion has already happened: a persistence error must not invite a duplicate retry.
  try { actions.persistDraft?.(); } catch { /* DSH also persists draft edits itself. */ }
}
