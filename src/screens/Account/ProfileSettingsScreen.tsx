import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { AvatarCropModal } from '../../components/AvatarCropModal';
import { Card } from '../../components/Card';
import { PlainButton } from '../../components/PlainButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { confirmAsync } from '../../lib/confirm';
import { removeAvatar, uploadAvatar } from '../../lib/profile';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';

export function ProfileSettingsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const email = useAuthStore((s) => s.session?.user.email);
  const storedName = useProfileStore((s) => s.name);
  const saveName = useProfileStore((s) => s.saveName);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const setAvatarUrl = useProfileStore((s) => s.setAvatarUrl);

  // Rather than copying storedName into local state via an effect once the
  // profile loads (which could clobber in-progress typing if storedName
  // changed again later), track only what the user has actually typed and
  // fall back to the store's value until they do.
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? storedName;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  /** Non-null while an image is waiting to be cropped in-app (web only). */
  const [cropUri, setCropUri] = useState<string | null>(null);

  const initial = (name || email || '?')[0]?.toUpperCase();
  const dirty = name.trim() !== storedName && name.trim().length > 0;
  /** Either avatar operation locks the other out, so a tap can't race a removal. */
  const avatarBusy = uploadingAvatar || removingAvatar;

  const onSave = async () => {
    if (!userId || !dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveName(userId, name.trim());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (uri: string, mimeType?: string | null) => {
    if (!userId) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const url = await uploadAvatar(userId, uri, mimeType);
      setAvatarUrl(url);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!userId) return;
    const confirmed = await confirmAsync(
      'Remove photo?',
      'Your profile will go back to showing your initial. You can upload a new photo any time.',
      'Remove'
    );
    if (!confirmed) return;

    setRemovingAvatar(true);
    setAvatarError(null);
    try {
      await removeAvatar(userId);
      setAvatarUrl(null);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to remove photo');
    } finally {
      setRemovingAvatar(false);
    }
  };

  const onPickAvatar = async () => {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError('Photo library permission is required to change your avatar.');
      return;
    }

    // iOS/Android get the OS's own crop UI, which is what users expect
    // there. `allowsEditing` does nothing on web, so that platform falls
    // through to AvatarCropModal instead of uploading uncropped.
    const useNativeCrop = Platform.OS !== 'web';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: useNativeCrop,
      aspect: [1, 1],
      // Android only: masks the crop area as a circle to match the avatar.
      shape: 'oval',
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (useNativeCrop) {
      await upload(asset.uri, asset.mimeType);
    } else {
      setCropUri(asset.uri);
    }
  };

  return (
    <ScreenContainer>
      <Card>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
          <Pressable onPress={onPickAvatar} disabled={avatarBusy}>
            <View style={{ width: 72, height: 72 }}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 72, height: 72, borderRadius: 36 }}
                />
              ) : (
                <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700' }}>{initial}</Text>
              </View>
              )}
              {avatarBusy ? (
                <View
                  style={{
                    position: 'absolute',
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : (
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    bottom: -2,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: colors.textPrimary,
                    borderWidth: 2,
                    borderColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              )}
            </View>
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {uploadingAvatar ? 'Uploading...' : removingAvatar ? 'Removing...' : 'Tap to change photo'}
          </Text>

          {/* Only offered when there's actually a photo to remove — otherwise
              it's a control that does nothing to the initials fallback. */}
          {avatarUrl ? (
            <AnimatedPressable
              onPress={onRemoveAvatar}
              disabled={avatarBusy}
              accessibilityRole="button"
              accessibilityLabel="Remove profile photo"
              scaleTo={0.96}
            >
              <Text style={[typography.caption, { color: colors.danger, fontWeight: '600' }]}>
                Remove photo
              </Text>
            </AnimatedPressable>
          ) : null}

          {avatarError ? <Text style={{ color: colors.danger }}>{avatarError}</Text> : null}
        </View>
      </Card>

      <Card title="Name">
        <TextInput
          value={name}
          onChangeText={(t) => {
            setNameOverride(t);
            setSaved(false);
          }}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.textPrimary,
          }}
        />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {saved ? <Text style={{ color: colors.success }}>Saved</Text> : null}
        <PlainButton label={saving ? 'Saving...' : 'Save'} loading={saving} disabled={!dirty} onPress={onSave} />
      </Card>

      <AvatarCropModal
        // Remount per image so zoom/position start fresh without a reset effect.
        key={cropUri ?? 'none'}
        uri={cropUri}
        onCancel={() => setCropUri(null)}
        onCropped={async (uri) => {
          setCropUri(null);
          await upload(uri, 'image/jpeg');
        }}
      />
    </ScreenContainer>
  );
}
