import { useCallback, useState } from 'react';
import { exportWorkoutHistory } from '../lib/dataExport';
import { saveTextFile } from '../lib/saveTextFile';
import { useAuthStore } from '../state/authStore';

/**
 * Export the member's full workout history as a CSV.
 *
 * Extracted from AccountScreen when the records screen wanted the same
 * button. Two copies of this would drift on the detail that matters most —
 * the outcome wording, which has to match what the platform actually did.
 * A share sheet and a download are different enough that reporting the wrong
 * one sends people looking in the wrong place for the file.
 */
export function useDataExport() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!userId || exporting) return;
    setExporting(true);
    setResult(null);
    try {
      const { csv, filename, rowCount } = await exportWorkoutHistory(userId);
      if (rowCount === 0) {
        setResult('Nothing logged yet, so there is no history to export.');
        return;
      }
      const outcome = await saveTextFile(filename, csv);
      setResult(
        outcome === 'downloaded'
          ? `Downloaded ${filename} — ${rowCount} sets.`
          : outcome === 'shared'
            ? `Shared ${filename} — ${rowCount} sets.`
            : 'This device has no way to share the file.'
      );
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Could not export your history.');
    } finally {
      setExporting(false);
    }
  }, [userId, exporting]);

  return { exporting, result, run };
}
