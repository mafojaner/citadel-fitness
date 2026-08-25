import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientNumberBadge } from '../../components/GradientNumberBadge';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useGroups } from '../../hooks/useGroups';
import { GROUP_PERIODS } from '../../lib/groups';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const RANK_GRADIENTS = [gradients.rankGold, gradients.rankSilver, gradients.rankBronze];

/**
 * Invite-only standings for a gym crew. The comparison window doubles as
 * the "challenge" — see groups.ts for why that isn't a stored object.
 */
export function GroupsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = GROUP_PERIODS[periodIndex];
  const {
    groups,
    selectedId,
    setSelectedId,
    standings,
    loading,
    busy,
    error,
    reload,
    create,
    join,
    leave,
    myUserId,
  } = useGroups(period.days);

  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const selected = groups.find((g) => g.id === selectedId);

  const inputStyle = {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
  };

  return (
    <ScreenContainer>
      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {groups.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {groups.map((group) => (
                <GradientPill
                  key={group.id}
                  label={group.name}
                  active={group.id === selectedId}
                  onPress={() => setSelectedId(group.id)}
                />
              ))}
            </View>
          ) : null}

          {selected ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <GradientIconBadge icon="people-circle" colors={gradients.rankGold} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                    {selected.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {selected.memberCount} member{selected.memberCount === 1 ? '' : 's'} · invite code{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {selected.inviteCode}
                    </Text>
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {GROUP_PERIODS.map((p, i) => (
                  <GradientPill
                    key={p.label}
                    label={p.label}
                    active={i === periodIndex}
                    onPress={() => setPeriodIndex(i)}
                    flex
                  />
                ))}
              </View>

              <View style={{ gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                {standings.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    Nobody has logged anything in this window yet.
                  </Text>
                ) : (
                  standings.map((standing, index) => {
                    const isMe = standing.userId === myUserId;
                    return (
                      <View
                        key={standing.userId}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                      >
                        <GradientNumberBadge
                          value={index + 1}
                          colors={RANK_GRADIENTS[index] ?? gradients.action}
                          size={30}
                          fontSize={13}
                        />
                        {standing.avatarUrl ? (
                          <Image
                            source={{ uri: standing.avatarUrl }}
                            style={{ width: 30, height: 30, borderRadius: 15 }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              backgroundColor: colors.primaryMuted,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                              {standing.name[0]?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text
                          style={[
                            typography.body,
                            {
                              flex: 1,
                              minWidth: 0,
                              color: colors.textPrimary,
                              fontWeight: isMe ? '800' : '400',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {standing.name}
                          {isMe ? ' (you)' : ''}
                        </Text>
                        <Text style={[typography.body, { color: colors.textSecondary }]}>
                          {standing.daysLogged} day{standing.daysLogged === 1 ? '' : 's'}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>

              <GradientButton
                label="Leave group"
                variant="outline"
                disabled={busy}
                onPress={() => leave(selected.id)}
              />
            </Card>
          ) : (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <GradientIconBadge icon="people-circle" colors={gradients.rankGold} size={44} />
                <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                    No groups yet
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Start one and share the code, or join a crew you&apos;ve been invited to.
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <Card title="Start a group">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Group name"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="New group name"
                style={inputStyle}
              />
            </View>
            <GradientButton
              label={busy ? 'Working...' : 'Create group'}
              loading={busy}
              disabled={newName.trim().length === 0 || busy}
              onPress={async () => {
                await create(newName.trim());
                setNewName('');
              }}
            />
          </Card>

          <Card title="Join with a code">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                accessibilityLabel="Invite code"
                style={inputStyle}
              />
            </View>
            <GradientButton
              label={busy ? 'Working...' : 'Join group'}
              loading={busy}
              disabled={code.trim().length === 0 || busy}
              onPress={async () => {
                await join(code.trim());
                setCode('');
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted, flex: 1, minWidth: 0 }]}>
                Members only see each other&apos;s name and how many days they trained. Never what
                was lifted, and never an email address.
              </Text>
            </View>
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}
