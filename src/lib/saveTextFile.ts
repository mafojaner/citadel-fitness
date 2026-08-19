import { Platform } from 'react-native';

/**
 * Hands a generated text file to the user, by whichever route the platform
 * actually supports.
 *
 * The two are genuinely different rather than one being a polyfill of the
 * other. expo-sharing explicitly cannot share local files on web — the Web
 * Share API has no equivalent — so web builds a blob and drives an anchor
 * download instead, which is the native browser idiom anyway. Native has no
 * download folder concept to target, so it writes to the app's cache and
 * opens the system share sheet, letting the user choose Files, Drive, mail
 * or anything else.
 *
 * Returns how it was delivered so the caller can word its confirmation
 * honestly: "downloaded" and "shared" are not the same claim.
 */
export type SaveOutcome = 'downloaded' | 'shared' | 'unsupported';

export async function saveTextFile(
  filename: string,
  contents: string,
  mimeType = 'text/csv'
): Promise<SaveOutcome> {
  if (Platform.OS === 'web') {
    // Guarded because this also runs under server rendering and in tests,
    // where there is no document to attach to.
    if (typeof document === 'undefined') return 'unsupported';

    const blob = new Blob([contents], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Revoked on the next tick rather than immediately: Safari cancels an
    // in-flight download if the object URL disappears synchronously.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return 'downloaded';
  }

  // Imported lazily so the web bundle never pulls in native-only modules,
  // and so a web build can't fail on a module it will never call.
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  const file = new File(Paths.cache, filename);
  // A previous export of the same name would otherwise make create() throw.
  if (file.exists) file.delete();
  file.create();
  file.write(contents);

  if (!(await Sharing.isAvailableAsync())) return 'unsupported';

  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: filename,
    // iOS needs the type declared separately from the MIME type.
    UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.plain-text',
  });

  return 'shared';
}
