import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { uploadAvatar } from '../../lib/profile';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
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
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const initial = (name || email || '?')[0]?.toUpperCase();
  const dirty = name.trim() !== storedName && name.trim().length > 0;

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

  const onPickAvatar = async () => {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError('Photo library permission is required to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const asset = result.assets[0];
      const url = await uploadAvatar(userId, asset.uri, asset.mimeType);
      setAvatarUrl(url);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <ScreenContainer>
      <Card>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
          <Pressable onPress={onPickAvatar} disabled={uploadingAvatar}>
            <View style={{ width: 72, height: 72 }}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 72, height: 72, borderRadius: 36 }}
                />
              ) : (
                <LinearGradient
                  colors={gradients.identity}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700' }}>{initial}</Text>
                </LinearGradient>
              )}
              {uploadingAvatar ? (
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
                    backgroundColor: colors.primary,
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
            {uploadingAvatar ? 'Uploading...' : 'Tap to change photo'}
          </Text>
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
        <GradientButton label={saving ? 'Saving...' : 'Save'} loading={saving} disabled={!dirty} onPress={onSave} />
      </Card>
    </ScreenContainer>
  );
}
