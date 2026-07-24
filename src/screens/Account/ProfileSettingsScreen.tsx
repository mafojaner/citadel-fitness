import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';

export function ProfileSettingsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const email = useAuthStore((s) => s.session?.user.email);
  const storedName = useProfileStore((s) => s.name);
  const loaded = useProfileStore((s) => s.loaded);
  const saveName = useProfileStore((s) => s.saveName);

  const [name, setName] = useState(storedName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded) setName(storedName);
  }, [loaded, storedName]);

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

  return (
    <ScreenContainer>
      <Card>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '700' }}>{initial}</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Avatar upload coming soon
          </Text>
        </View>
      </Card>

      <Card title="Name">
        <TextInput
          value={name}
          onChangeText={(t) => {
            setName(t);
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
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          style={({ pressed }) => ({
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            padding: spacing.md,
            alignItems: 'center',
            opacity: pressed || saving || !dirty ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.surface, fontWeight: '700' }}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </Card>
    </ScreenContainer>
  );
}
