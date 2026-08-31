-- Fill out the exercise catalogue, and add the category it was missing.
--
-- The headline is that there was no `shoulders` category at all. Not an
-- empty one -- no category, and not one shoulder movement anywhere in 125
-- exercises. No overhead press, no lateral raise, no shrug. The app's own
-- Push/Pull/Legs article tells people a push day is "bench press, overhead
-- press, dips, lateral raises", and the app could log exactly one of those
-- four. Anyone running the split the newsletter recommends had to file
-- their pressing under Chest and their laterals under nothing.
--
-- The rest is topping every category up to at least twenty, which is the
-- point at which a category browses like a catalogue rather than a
-- shortlist. Counts before this migration: legs 23, back/chest/cardio 18,
-- arms 17, core 12, boxing 11, glutes 8, shoulders 0.
--
-- `on conflict (name) do nothing` throughout, against the existing
-- exercises_name_unique. That makes this re-runnable and means a name that
-- turns out to already exist is skipped rather than aborting the whole
-- migration -- which matters because the catalogue is seeded across five
-- earlier migrations and "is Meadows Row already in there" is not something
-- worth being wrong about at 3am.
--
-- Checked before writing this: pg_trigger reports no non-internal triggers
-- on public.exercises, so these inserts send no email and call no webhook.
-- That check is repeated per migration rather than inherited -- the
-- articles table grew a newsletter trigger between two migrations that both
-- assumed it had none.

-- ---------------------------------------------------------------------------
-- Shoulders — the missing category
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Overhead Press', 'shoulders', 'strength', 'Press a barbell from the front rack to lockout overhead while standing. The benchmark shoulder lift, and the one the catalogue was missing entirely.', false),
  ('Seated Dumbbell Shoulder Press', 'shoulders', 'strength', 'Press dumbbells overhead from a seated upright bench, which takes the legs and lower back out of it.', false),
  ('Arnold Press', 'shoulders', 'strength', 'A dumbbell press that rotates from palms-in to palms-out on the way up, working the front and side delts through a longer arc.', false),
  ('Push Press', 'shoulders', 'strength', 'An overhead press driven by a short dip and leg drive, letting you move more weight than a strict press.', false),
  ('Lateral Raise', 'shoulders', 'strength', 'Raise dumbbells out to the sides to shoulder height. The most direct side-delt movement there is.', false),
  ('Cable Lateral Raise', 'shoulders', 'strength', 'A lateral raise from a low cable, which keeps tension on the side delt at the bottom where dumbbells go slack.', false),
  ('Front Raise', 'shoulders', 'strength', 'Raise a weight in front of you to shoulder height, isolating the front delt.', false),
  ('Plate Front Raise', 'shoulders', 'strength', 'A front raise holding a plate at the edges, which adds a grip and rotational demand.', false),
  ('Rear Delt Machine Fly', 'shoulders', 'strength', 'A reverse fly on a pec deck set to open outward, hitting the rear delts without balancing a dumbbell.', false),
  ('Cable Rear Delt Row', 'shoulders', 'strength', 'A high cable row pulled toward the face with elbows flared, for rear delts and upper back.', false),
  ('Upright Row', 'shoulders', 'strength', 'Pull a bar up the front of the body to chest height with high elbows. Narrow grips bother some shoulders, so widen it if it pinches.', false),
  ('Machine Shoulder Press', 'shoulders', 'strength', 'A fixed-path overhead press, useful when you want to push close to failure without a spotter.', false),
  ('Smith Machine Shoulder Press', 'shoulders', 'strength', 'An overhead press on a guided bar, which removes the balance demand and keeps the path identical rep to rep.', false),
  ('Barbell Shrug', 'shoulders', 'strength', 'Lift the shoulders straight up holding a loaded bar, working the upper traps.', false),
  ('Dumbbell Shrug', 'shoulders', 'strength', 'A shrug with dumbbells at your sides, which allows a slightly longer range than a bar across the thighs.', false),
  ('Z Press', 'shoulders', 'strength', 'An overhead press performed seated on the floor with legs straight, which removes every bit of leg drive and exposes a weak upper back.', false),
  ('Cuban Press', 'shoulders', 'strength', 'An upright row into an external rotation into a press. A rotator-cuff movement more than a mass builder, so keep it light.', false),
  ('Bradford Press', 'shoulders', 'strength', 'Press a bar just over the head and alternate front to back without locking out, keeping constant tension on the delts.', false),
  ('Pike Push-Up', 'shoulders', 'strength', 'A push-up with hips high and head driving toward the floor, the bodyweight route to overhead pressing strength.', false),
  ('Handstand Push-Up', 'shoulders', 'strength', 'A press to lockout while inverted against a wall. Demanding, and worth building up to with pike push-ups first.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Glutes — 8 to 20
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Barbell Glute Bridge', 'glutes', 'strength', 'A glute bridge from the floor with a loaded bar across the hips, shorter in range than a hip thrust and easier to set up.', false),
  ('Single-Leg Hip Thrust', 'glutes', 'strength', 'A hip thrust driven by one leg, which exposes and evens out a side-to-side difference.', false),
  ('Glute Ham Raise', 'glutes', 'strength', 'Lower and raise the torso from a GHD bench using the hamstrings and glutes. Brutal, and one of the best posterior-chain builders there is.', false),
  ('Kettlebell Swing', 'glutes', 'strength', 'A hip hinge that snaps a kettlebell to chest height. The power comes from the hips, not the arms.', false),
  ('Sumo Squat', 'glutes', 'strength', 'A squat with a wide stance and toes turned out, which shifts work toward the glutes and inner thighs.', false),
  ('Single-Leg Romanian Deadlift', 'glutes', 'strength', 'A hinge on one leg with the other extending behind, working glutes, hamstrings and balance at once.', false),
  ('Monster Walk', 'glutes', 'strength', 'Walk forward and back against a band around the thighs, keeping tension out to the sides.', false),
  ('Fire Hydrant', 'glutes', 'strength', 'From all fours, lift one bent leg out to the side. A small movement that reaches the glute medius.', false),
  ('Donkey Kick', 'glutes', 'strength', 'From all fours, drive one heel toward the ceiling with the knee bent, squeezing at the top.', false),
  ('Lateral Step-Up', 'glutes', 'strength', 'Step sideways onto a box and stand up through that leg, loading the glute medius under real weight.', false),
  ('Deficit Reverse Lunge', 'glutes', 'strength', 'A reverse lunge stepping back off a raised platform, which lengthens the range at the hip.', false),
  ('Hip Thrust Machine', 'glutes', 'strength', 'A fixed-path hip thrust, which removes the awkward barbell setup and lets you load it heavily.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Core — 12 to 20
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Hollow Body Hold', 'core', 'cardio', 'Lie on your back and hold shoulders and legs off the floor in a shallow dish. Timed, because the difficulty is holding position rather than repeating it.', false),
  ('Copenhagen Plank', 'core', 'cardio', 'A side plank with the top leg supported on a bench, loading the adductors as well as the obliques. Timed.', false),
  ('V-Up', 'core', 'strength', 'Lift the legs and torso together to meet over the hips, folding at the middle.', false),
  ('Toes-to-Bar', 'core', 'strength', 'Hang from a bar and raise the feet to touch it. A hanging leg raise taken to full range.', false),
  ('Pallof Press', 'core', 'strength', 'Press a cable straight out from the chest while it tries to rotate you. Anti-rotation, so the work is in not moving.', false),
  ('Decline Sit-Up', 'core', 'strength', 'A sit-up on a decline bench, which lengthens the range and lets you hold a weight at the chest.', false),
  ('Cable Woodchop', 'core', 'strength', 'Pull a cable diagonally across the body from high to low, training rotation under load.', false),
  ('Reverse Crunch', 'core', 'strength', 'Curl the hips off the floor to bring the knees toward the chest, working the lower abs without pulling on the neck.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Boxing — 11 to 20
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Reflex Ball Drill', 'boxing', 'cardio', 'Rounds against a head-mounted or floor-standing reflex ball, training timing and eye tracking rather than power.', false),
  ('Body Shot Rounds', 'boxing', 'cardio', 'Bag rounds worked exclusively to the body, which forces you to bend the knees rather than reach with the arms.', false),
  ('Clinch Work', 'boxing', 'cardio', 'Rounds of close-range control and framing with a partner. Exhausting in a way that does not look like it from outside.', false),
  ('Combination Drill', 'boxing', 'cardio', 'Rounds throwing set combinations on call, building the sequence until it needs no thought.', false),
  ('Head Movement Drill', 'boxing', 'cardio', 'Rounds of slipping, rolling and pivoting without throwing, so defence gets trained on its own instead of as an afterthought.', false),
  ('Shadowboxing with Weights', 'boxing', 'strength', 'Shadowboxing holding light dumbbells. Keep them light and the rounds short; this is shoulder endurance, not a strength lift.', false),
  ('Medicine Ball Slam', 'boxing', 'strength', 'Drive a medicine ball overhead and into the floor, training the same downward power a body shot uses.', false),
  ('Neck Harness Flexion', 'boxing', 'strength', 'Neck flexion against a harness, the front-side counterpart to the extension work already in the catalogue.', false),
  ('Wall Ball Throw', 'boxing', 'strength', 'Throw a medicine ball to a target on a wall and catch the rebound, training explosive extension and the catch.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Arms, back, chest, cardio — topping the last few up to 20
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Spider Curl', 'arms', 'strength', 'A curl performed chest-down on an incline bench, which removes any swing and keeps the biceps under load throughout.', false),
  ('Reverse Curl', 'arms', 'strength', 'A curl with palms facing down, shifting work to the brachialis and forearms.', false),
  ('JM Press', 'arms', 'strength', 'A hybrid of a close-grip press and a skull crusher, favoured for building lockout strength in the triceps.', false),

  ('Chest-Supported Row', 'back', 'strength', 'A row lying face-down on an incline bench, which takes the lower back out entirely and stops you cheating the weight up.', false),
  ('Meadows Row', 'back', 'strength', 'A single-arm row from the end of a landmine bar, taken with a staggered stance for a long stretch at the bottom.', false),

  ('Dumbbell Pullover', 'chest', 'strength', 'Lower a dumbbell back over the head while lying across a bench, opening the ribcage and stretching the chest and lats.', false),
  ('Deficit Push-Up', 'chest', 'strength', 'A push-up with the hands raised on blocks so the chest travels below them, adding range to a movement that usually runs out of it.', false)
on conflict (name) do nothing;

insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Ski Erg', 'cardio', 'cardio', 'A standing pull-down machine that mimics the double-pole of cross-country skiing. Hits the lats and triceps harder than a rower.', true),
  ('Sled Push', 'cardio', 'cardio', 'Drive a weighted sled across a floor. Almost entirely concentric, so it is punishing without leaving you sore for days.', true)
on conflict (name) do nothing;

-- Prove the point of the migration rather than assuming it. Runs before the
-- transaction commits, so a category that came up short takes the whole
-- thing with it rather than shipping a half-filled catalogue.
do $$
declare r record; short text := '';
begin
  for r in
    select category, count(*) as n
    from public.exercises
    group by category
    order by category
  loop
    if r.n < 20 then
      short := short || format(' %s=%s', r.category, r.n);
    end if;
  end loop;

  if short <> '' then
    raise exception 'catalogue expansion: these categories are still under twenty --%', short;
  end if;

  if not exists (select 1 from public.exercises where category = 'shoulders') then
    raise exception 'catalogue expansion: the shoulders category was not created';
  end if;
end $$;
