import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Share, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { EmptyState } from '../../components/EmptyState';
import { GradientButton } from '../../components/GradientButton';
import { GroupChallengeCard } from '../../components/GroupChallengeCard';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientNumberBadge } from '../../components/GradientNumberBadge';
import { GradientPill } from '../../components/GradientPill';
import { PlainButton } from '../../components/PlainButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useArmedAction } from '../../hooks/useArmedAction';
import { useGroupChallenge } from '../../hooks/useGroupChallenge';
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
  // Collapsed once you are in a group. Starting and joining are things you
  // do once; the standings are what you come back for, and two forms parked
  // permanently underneath them meant every visit after the first opened on
  // half a screen of setup.
  const [addingGroup, setAddingGroup] = useState(false);
  // Two taps to leave. You would need the invite code again to get back in,
  // and there is no undo -- same reason the program card arms its own leave.
  // Disarms itself after a few seconds; see useArmedAction.
  const { armed: confirmingLeave, trigger: triggerLeave } = useArmedAction(() => {
    if (selectedId) leave(selectedId);
  });
  const selected = groups.find((g) => g.id === selectedId);

  const { challenge, reload: loadChallenge } = useGroupChallenge(selectedId);

  const shareInvite = async () => {
    if (!selected) return;
    // The same React Native Share the referral screen uses, for the same
    // reason: this is a string rather than a file, and Share is what reaches
    // messaging apps. A private group is invite-only, so handing someone the
    // code is the feature -- and until now the code was displayed as plain
    // text with no way to send it anywhere.
    await Share.share({
      message: `Join my group "${selected.name}" on Citadel Fitness. Use invite code ${selected.inviteCode}.`,
    });
  };

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
                  <Text
                    style={[typography.caption, { color: colors.textMuted }]}
                    accessibilityLabel={`${selected.memberCount} members. Invite code ${selected.inviteCode.split('').join(' ')}`}
                  >
                    {selected.memberCount} member{selected.memberCount === 1 ? '' : 's'} · invite code{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {selected.inviteCode}
                    </Text>
                  </Text>
                </View>
              </View>

              <PlainButton label="Share invite code" onPress={shareInvite} />

              {/* The challenge, above the rolling standings it gives a
                  deadline to. Ordered that way deliberately: the standings
                  are the ambient state, the challenge is the thing with an
                  end date, and the one with an end date is the one worth
                  reading first. */}
              <GroupChallengeCard
                groupId={selected.id}
                challenge={challenge}
                onChanged={loadChallenge}
              />

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
                label={confirmingLeave ? 'Tap again to leave' : 'Leave group'}
                variant="outline"
                disabled={busy}
                onPress={triggerLeave}
              />
            </Card>
          ) : (
            <EmptyState
              icon="people-circle"
              colors={gradients.rankGold}
              title="No groups yet"
              detail="Start one and share the code, or join a crew you've been invited to."
            />
          )}

          {selected && !addingGroup ? (
            <PlainButton label="Start or join another group" onPress={() => setAddingGroup(true)} />
          ) : null}

          {selected && !addingGroup ? null : (
          <>
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
          {selected ? (
            <PlainButton label="Done" onPress={() => setAddingGroup(false)} />
          ) : null}
          </>
          )}
        </>
      )}
    </ScreenContainer>
  );
}
