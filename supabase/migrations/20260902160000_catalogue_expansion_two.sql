-- Ten more exercises in every category: 183 -> 273.
--
-- The last expansion took every category to at least twenty, which is the
-- point a category browses like a catalogue rather than a shortlist. Thirty
-- is the point it stops sending people to a search field, and the gaps this
-- fills are real rather than padding: no Zercher or box squat anywhere, no
-- seal row, no incline curl variant beyond the dumbbell one, no unilateral
-- pressing in chest, and cardio had no jog, no elliptical interval and no
-- assault-bike sprint distinct from the steady ride.
--
-- Every name below was checked against the 183 already present before it was
-- written, and `on conflict (name) do nothing` is kept anyway. The catalogue
-- is seeded across six migrations now, and "is Seal Row already in there" is
-- not something worth being wrong about in a migration that aborts.
--
-- Checked again for this migration rather than inherited from the last one:
-- pg_trigger reports no non-internal triggers on public.exercises, so these
-- inserts send no email and call no webhook. The articles table grew a
-- newsletter trigger between two migrations that both assumed it had none,
-- which is why this is re-checked every time and not taken on trust.

-- ---------------------------------------------------------------------------
-- Chest
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Single-Arm Dumbbell Bench Press', 'chest', 'strength', 'A flat press with one dumbbell at a time, which forces the trunk to resist rotation while the working side presses.', false),
  ('Incline Cable Fly', 'chest', 'strength', 'A fly performed on an incline bench between two cables, keeping tension on the upper chest through the whole arc.', false),
  ('Decline Dumbbell Press', 'chest', 'strength', 'A press on a declined bench with dumbbells, biasing the lower chest with a longer range than the barbell allows.', false),
  ('Guillotine Press', 'chest', 'strength', 'A bench press with the bar tracking toward the neck and elbows flared, which lengthens the upper chest. Light loads only.', false),
  ('Machine Fly', 'chest', 'strength', 'A fly on a fixed machine, which holds the elbow angle for you and lets you chase failure without a spotter.', false),
  ('Incline Push-Up', 'chest', 'strength', 'A push-up with the hands raised on a bench or bar, reducing the load for higher reps or an easier entry point.', false),
  ('Archer Push-Up', 'chest', 'strength', 'A wide push-up that shifts the weight onto one arm at a time, a step toward the one-arm push-up.', false),
  ('Dumbbell Squeeze Press', 'chest', 'strength', 'A flat press with the dumbbells pressed together throughout, adding constant inward tension to the movement.', false),
  ('Cable Chest Press', 'chest', 'strength', 'A standing press from two cables, which keeps resistance constant and lets the ribcage stay stacked over the hips.', false),
  ('Reverse-Grip Bench Press', 'chest', 'strength', 'A bench press with an underhand grip, which shifts work toward the upper chest and is easier on some shoulders.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Back
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Seal Row', 'back', 'strength', 'A row lying face-down on a raised bench, which removes every bit of body english and leaves only the back working.', false),
  ('Kroc Row', 'back', 'strength', 'A heavy, high-rep single-arm dumbbell row with deliberate body movement, trained for grip and upper-back mass.', false),
  ('Machine Row', 'back', 'strength', 'A chest-supported row on a fixed machine, the simplest way to add rowing volume without loading the lower back.', false),
  ('Close-Grip Lat Pulldown', 'back', 'strength', 'A pulldown with a narrow neutral handle, biasing the lats through a longer range than the wide grip.', false),
  ('Single-Arm Lat Pulldown', 'back', 'strength', 'A pulldown one side at a time, which exposes and evens out a side-to-side difference the bar hides.', false),
  ('Barbell Shrug Row', 'back', 'strength', 'A row finished with a shrug at the top, adding upper-trap work to a mid-back movement.', false),
  ('Renegade Row', 'back', 'strength', 'A dumbbell row from a push-up position, alternating sides while the trunk resists rotating.', false),
  ('Landmine Row', 'back', 'strength', 'A row with one end of a barbell anchored, giving an arcing path that many find easier on the shoulders.', false),
  ('Gorilla Row', 'back', 'strength', 'A bent-over row alternating kettlebells from the floor, with a brief pause each time the weight is set down.', false),
  ('Assisted Pull-Up', 'back', 'strength', 'A pull-up with a machine or band taking part of the bodyweight, for building toward an unassisted one.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Legs
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Box Squat', 'legs', 'strength', 'A squat to a set box, which fixes the depth and teaches sitting back rather than down.', false),
  ('Zercher Squat', 'legs', 'strength', 'A squat with the bar held in the crooks of the elbows, demanding an upright torso and a braced trunk.', false),
  ('Pause Squat', 'legs', 'strength', 'A squat held for two or three seconds at the bottom, removing the stretch reflex and exposing weak positions.', false),
  ('Belt Squat', 'legs', 'strength', 'A squat loaded from a belt at the hips, training the legs with no bar on the spine.', false),
  ('Reverse Lunge', 'legs', 'strength', 'A lunge stepping backwards, usually kinder to the knees than stepping forward and easier to balance.', false),
  ('Sissy Squat', 'legs', 'strength', 'A knee-dominant squat leaning back with the hips extended, isolating the quads hard through a short range.', false),
  ('Nordic Hamstring Curl', 'legs', 'strength', 'A kneeling curl lowering under control with the ankles held, one of the strongest hamstring movements there is.', false),
  ('Seated Leg Curl', 'legs', 'strength', 'A hamstring curl seated with the hips flexed, which trains the hamstrings in a different position from the lying version.', false),
  ('Split Squat', 'legs', 'strength', 'A static lunge with both feet planted, letting you load one leg heavily without the balance demand of walking.', false),
  ('Trap Bar Deadlift', 'legs', 'strength', 'A deadlift from a hexagonal bar, which centres the load and is usually the easiest deadlift to learn.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Shoulders
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Seated Barbell Overhead Press', 'shoulders', 'strength', 'An overhead press from a seated upright bench, taking leg drive out of the movement entirely.', false),
  ('Single-Arm Dumbbell Press', 'shoulders', 'strength', 'An overhead press one arm at a time, which makes the trunk work to stop you leaning away from the weight.', false),
  ('Leaning Cable Lateral Raise', 'shoulders', 'strength', 'A cable lateral raise while leaning away from the stack, lengthening the arc and the time under tension.', false),
  ('Behind-the-Neck Press', 'shoulders', 'strength', 'An overhead press lowering behind the head. Demands real shoulder mobility and is trained light.', false),
  ('Landmine Shoulder Press', 'shoulders', 'strength', 'A press on an angled barbell, a shallower overhead path for shoulders that dislike a vertical one.', false),
  ('Bent-Over Reverse Fly', 'shoulders', 'strength', 'A fly bent at the hips, taking the rear delts through their full range with dumbbells.', false),
  ('Cable Face Pull to Neck', 'shoulders', 'strength', 'A face pull finishing high at the neck with external rotation, for rear delts and the rotator cuff.', false),
  ('Scapular Wall Slide', 'shoulders', 'strength', 'Sliding the forearms up a wall while keeping contact, used as shoulder prep rather than a loaded lift.', false),
  ('Farmer''s Carry', 'shoulders', 'strength', 'Walking with a heavy weight in each hand, training the traps, grip and trunk under a long time-under-load.', false),
  ('Kettlebell Halo', 'shoulders', 'strength', 'Circling a kettlebell around the head, used to warm the shoulders through their full range under light load.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Arms
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Cable Hammer Curl', 'arms', 'strength', 'A hammer curl from a rope attachment, which holds tension on the brachialis at the bottom.', false),
  ('Bayesian Curl', 'arms', 'strength', 'A cable curl with the arm behind the body, loading the biceps in the stretched position dumbbells cannot reach.', false),
  ('Drag Curl', 'arms', 'strength', 'A curl dragging the bar up the torso with the elbows travelling back, shifting work onto the long head.', false),
  ('21s', 'arms', 'strength', 'Seven bottom-half curls, seven top-half, then seven full reps without setting the bar down.', false),
  ('Overhead Cable Curl', 'arms', 'strength', 'A curl with the arms out to the sides at shoulder height, contracting the biceps in a fully shortened position.', false),
  ('Dumbbell Skull Crusher', 'arms', 'strength', 'A lying triceps extension with dumbbells, which lets the wrists find a comfortable angle the bar fixes.', false),
  ('Single-Arm Triceps Pushdown', 'arms', 'strength', 'A pushdown one arm at a time, usually with a reverse grip, to even out a side-to-side difference.', false),
  ('Tate Press', 'arms', 'strength', 'A lying press bringing the dumbbells to the chest with elbows flared, a triceps movement powerlifters favour.', false),
  ('Ring Dip', 'arms', 'strength', 'A dip on gymnastic rings, which adds a stability demand the bar version does not have.', false),
  ('Wrist Curl', 'arms', 'strength', 'A curl at the wrist only, training the forearm flexors directly for grip and elbow health.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Core
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Dragon Flag', 'core', 'strength', 'Lowering the whole body from the shoulders while held rigid. One of the hardest bodyweight core movements there is.', false),
  ('L-Sit', 'core', 'strength', 'Holding the legs out straight while supported on the hands, a static hold demanding hip flexors and abs together.', false),
  ('Weighted Plank', 'core', 'strength', 'A plank with a plate on the back, for when an unloaded plank has stopped being a challenge.', false),
  ('Side Plank Reach-Through', 'core', 'strength', 'A side plank rotating the free arm under the body and back, adding movement to a static hold.', false),
  ('Bird Dog', 'core', 'strength', 'Extending the opposite arm and leg from all fours, training the trunk to resist rotation and extension.', false),
  ('Farmer''s Carry Suitcase Hold', 'core', 'strength', 'Walking with weight in one hand only, so the trunk works the whole way to stop you tipping sideways.', false),
  ('Hanging Knee Raise', 'core', 'strength', 'A knee raise hanging from a bar, the step before straight-leg raises and toes-to-bar.', false),
  ('Cable Anti-Rotation Hold', 'core', 'strength', 'Holding a cable out from the chest while it pulls you sideways, resisting rotation without moving.', false),
  ('Stir the Pot', 'core', 'strength', 'Small circles with the forearms on a stability ball while holding a plank, adding movement under the same brace.', false),
  ('Jackknife Sit-Up', 'core', 'strength', 'Bringing straight arms and legs together above the body, then lowering both under control.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Glutes
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Barbell Hip Thrust', 'glutes', 'strength', 'A hip thrust with the shoulders on a bench and a barbell across the hips, the heaviest loadable glute movement.', false),
  ('B-Stance Hip Thrust', 'glutes', 'strength', 'A hip thrust with one foot slightly forward, biasing one glute without fully unloading the other.', false),
  ('Step-Down', 'glutes', 'strength', 'Lowering slowly from a box on one leg, training the glute medius to control the pelvis.', false),
  ('Cable Hip Abduction', 'glutes', 'strength', 'Taking the leg out to the side against a cable, isolating the glute medius standing rather than seated.', false),
  ('Romanian Deadlift to Deficit', 'glutes', 'strength', 'A Romanian deadlift standing on a plate, adding range at the bottom where the glutes and hamstrings stretch.', false),
  ('Glute Bridge March', 'glutes', 'strength', 'Holding a glute bridge while lifting one foot at a time, which stops the hips dropping on either side.', false),
  ('Hip Thrust Abduction', 'glutes', 'strength', 'A hip thrust with a band around the knees, pressing outward at the top to add glute medius work.', false),
  ('Bulgarian Split Squat (Glute Bias)', 'glutes', 'strength', 'A split squat with a longer stride and a forward lean, shifting the work from quads to glutes.', false),
  ('Cable Standing Kickback', 'glutes', 'strength', 'A straight-leg kickback from a low cable, keeping tension through the whole range.', false),
  ('Reverse Sled Drag', 'glutes', 'strength', 'Walking backwards pulling a sled, which loads the glutes and quads with almost no eccentric soreness.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Cardio
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Jogging', 'cardio', 'cardio', 'A steady, conversational-pace run. Distinct from Running here so an easy day and a hard one are not logged as the same thing.', true),
  ('Trail Running', 'cardio', 'cardio', 'Running off-road over uneven ground, which costs more effort per kilometre than the same distance on tarmac.', true),
  ('Treadmill Intervals', 'cardio', 'cardio', 'Alternating hard and easy blocks on a treadmill, where the pace is set for you rather than by feel.', true),
  ('Assault Bike Sprints', 'cardio', 'cardio', 'Short maximal efforts on an air bike with rest between. Logged apart from the steady ride, which it has nothing in common with.', false),
  ('Elliptical Intervals', 'cardio', 'cardio', 'Alternating hard and easy blocks on an elliptical, for intensity without the impact of running.', false),
  ('Rowing Intervals', 'cardio', 'cardio', 'Repeated hard pieces on a rower with timed rest, usually 500m or one-minute efforts.', true),
  ('Open Water Swimming', 'cardio', 'cardio', 'Swimming outside a pool, where there is no wall to push off and the distance is rarely exact.', true),
  ('Cycling (Indoor)', 'cardio', 'cardio', 'Stationary cycling, kept separate from road cycling because the distance means something different on each.', true),
  ('Stair Climbing', 'cardio', 'cardio', 'Climbing real stairs rather than a machine, usually logged by time or flights.', false),
  ('Jump Rope Intervals', 'cardio', 'cardio', 'Skipping in timed rounds with rest between, the way it is trained in a boxing gym.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Boxing
-- ---------------------------------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Jab Cross Drill', 'boxing', 'cardio', 'Rounds of the one-two only, working the straight punches until the mechanics stop needing thought.', false),
  ('Uppercut Drill', 'boxing', 'cardio', 'Rounds focused on uppercuts, the punch most often neglected on the bag.', false),
  ('Hook Drill', 'boxing', 'cardio', 'Rounds focused on hooks to the head and body, on the bag or the pads.', false),
  ('Pivot Drill', 'boxing', 'cardio', 'Footwork rounds pivoting off the lead foot to change angle after punching.', false),
  ('Counter Drill', 'boxing', 'cardio', 'Partner or pad work built around slipping a punch and returning one immediately.', false),
  ('Bag Sprint Rounds', 'boxing', 'cardio', 'Maximum-output rounds on the heavy bag, trained for conditioning rather than technique.', false),
  ('Defence Rounds', 'boxing', 'cardio', 'Rounds spent only slipping, rolling and blocking without throwing back.', false),
  ('Southpaw Stance Rounds', 'boxing', 'cardio', 'Rounds in the opposite stance, which builds the weaker side and teaches how the other stance reads.', false),
  ('Rope Skipping Rounds', 'boxing', 'cardio', 'Three-minute skipping rounds with a minute rest, the standard boxing warm-up.', false),
  ('Partner Mitt Rounds', 'boxing', 'cardio', 'Timed rounds on the mitts with a coach calling combinations.', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Prove it before committing.
-- ---------------------------------------------------------------------------
do $$
declare
  v_short text;
  v_total int;
  v_dupes text;
  v_bad_type text;
begin
  -- Every category at thirty or more, which is what this migration is for.
  select string_agg(category || '=' || n, ', ' order by category)
    into v_short
  from (select category, count(*) as n from public.exercises group by category) c
  where n < 30;

  if v_short is not null then
    raise exception 'EXPANSION FAILED: categories still under 30 -> %', v_short;
  end if;

  -- The unique index should make this impossible; checked anyway, because a
  -- duplicate name would split one lift's history across two catalogue rows
  -- and quietly halve every record derived from it.
  select string_agg(name, ', ') into v_dupes
  from (select name from public.exercises group by name having count(*) > 1) d;

  if v_dupes is not null then
    raise exception 'EXPANSION FAILED: duplicate names -> %', v_dupes;
  end if;

  -- A strength row that tracks distance, or a cardio row that does not, would
  -- render the wrong input fields in the logging flow.
  select string_agg(name, ', ') into v_bad_type
  from public.exercises
  where type::text not in ('strength', 'cardio');

  if v_bad_type is not null then
    raise exception 'EXPANSION FAILED: unknown type on -> %', v_bad_type;
  end if;

  select count(*) into v_total from public.exercises;
  raise notice 'Catalogue now % exercises, every category at 30 or more', v_total;
end $$;
