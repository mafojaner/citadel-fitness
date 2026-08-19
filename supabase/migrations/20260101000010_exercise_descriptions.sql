-- Run this in the Supabase SQL Editor.
-- 1. Adds a description column to the exercise catalogue and backfills it
--    for every exercise seeded so far.
-- 2. Expands the catalogue with ~40 additional exercises (with
--    descriptions from the start) across all five categories.

alter table public.exercises
  add column if not exists description text;

-- Backfill descriptions for the existing catalogue ----------------------
update public.exercises as e set description = v.description
from (values
  -- Chest
  ('Bench Press', 'Lie on a flat bench and press a barbell from the chest to full arm extension, the core builder for chest, front shoulders, and triceps.'),
  ('Incline Dumbbell Press', 'Press dumbbells upward on an inclined bench to emphasize the upper chest and front shoulders.'),
  ('Push-Up', 'A bodyweight press from a plank position that builds the chest, shoulders, triceps, and core with no equipment.'),
  ('Incline Barbell Press', 'Barbell press performed on an incline bench, shifting more emphasis onto the upper chest and shoulders.'),
  ('Decline Bench Press', 'Barbell press on a decline bench that targets the lower chest fibers.'),
  ('Dumbbell Fly', 'Lying on a bench, sweep dumbbells out and back together in an arc to isolate and stretch the chest.'),
  ('Cable Crossover', 'Standing between two cable stacks, pull the handles down and across the body to isolate the chest with constant tension.'),
  ('Chest Dip', 'Lower and press the body between parallel bars, leaning forward to bias the lower chest and triceps.'),
  ('Machine Chest Press', 'A guided pressing machine that trains the chest and triceps with a fixed, stable path of motion.'),
  ('Pec Deck', 'A machine fly where the arms are brought together in front of the chest, isolating the pectoral muscles.'),

  -- Back
  ('Pull-Up', 'Hang from an overhead bar and pull the chin above it, building the lats, upper back, and biceps.'),
  ('Barbell Row', 'Hinge forward and row a barbell into the torso to build thickness through the mid-back and lats.'),
  ('Lat Pulldown', 'Pull a cable bar down to the chest from an overhead position, a pull-up alternative for the lats and biceps.'),
  ('Chin-Up', 'An underhand-grip pull-up variation that adds extra biceps involvement alongside the lats.'),
  ('Dumbbell Row', 'Support one arm on a bench and row a dumbbell into the hip to work one side of the back at a time.'),
  ('T-Bar Row', 'Row a loaded bar anchored at one end using a chest-supported or bent-over stance to build back thickness.'),
  ('Seated Cable Row', 'Seated cable pull into the torso that builds the mid-back with continuous tension through the movement.'),
  ('Face Pull', 'Pull a rope attachment toward the face at eye level to strengthen the rear delts and upper back.'),
  ('Hyperextension', 'Bend and extend at the hips on a back extension bench to strengthen the lower back and glutes.'),
  ('Straight-Arm Pulldown', 'Keeping the arms straight, pull a cable bar down from overhead to isolate the lats.'),

  -- Legs
  ('Squat', 'The foundational lower-body lift: bend the knees and hips to lower a barbell load and drive back up, building the quads, glutes, and hamstrings.'),
  ('Deadlift', 'Lift a loaded barbell from the floor to hip level by extending the hips and knees, one of the biggest full-body strength builders.'),
  ('Lunges', 'Step forward and lower the back knee toward the floor, working each leg unilaterally through the quads and glutes.'),
  ('Front Squat', 'A squat with the bar racked across the front shoulders, shifting emphasis onto the quads and upper back.'),
  ('Leg Press', 'Push a weighted sled away from the body on a seated machine to train the quads, glutes, and hamstrings.'),
  ('Romanian Deadlift', 'Hinge at the hips with a slight knee bend to lower a barbell along the legs, targeting the hamstrings and glutes.'),
  ('Leg Curl', 'Curl the heels toward the glutes on a machine to isolate the hamstrings.'),
  ('Leg Extension', 'Extend the knees against resistance on a seated machine to isolate the quadriceps.'),
  ('Calf Raise', 'Rise onto the toes against resistance to build the calf muscles.'),
  ('Hip Thrust', 'Drive the hips upward with the upper back supported on a bench to build the glutes.'),
  ('Bulgarian Split Squat', 'A single-leg squat with the rear foot elevated behind you, building unilateral leg and glute strength.'),

  -- Arms
  ('Barbell Curl', 'Curl a barbell from the thighs to shoulder height to build the biceps.'),
  ('Dumbbell Curl', 'Curl a dumbbell in each hand to build the biceps, allowing each arm to move independently.'),
  ('Hammer Curl', 'Curl dumbbells with a neutral, palms-facing-in grip to build the biceps and forearms.'),
  ('Preacher Curl', 'Curl a bar or dumbbell with the arms braced against an angled pad to isolate the biceps and remove momentum.'),
  ('Cable Curl', 'Curl a cable attachment to build the biceps with constant tension throughout the movement.'),
  ('Triceps Pushdown', 'Push a cable attachment down to full arm extension to isolate the triceps.'),
  ('Skull Crusher', 'Lying down, lower a bar or dumbbells toward the forehead and extend back up to build the triceps.'),
  ('Overhead Triceps Extension', 'Lower a weight behind the head and extend the arms overhead to target the long head of the triceps.'),
  ('Close-Grip Bench Press', 'A bench press performed with a narrower hand spacing that shifts emphasis onto the triceps.'),

  -- Cardio
  ('Running', 'Sustained running at an outdoor or treadmill pace to build cardiovascular endurance.'),
  ('Cycling', 'Pedaling on a bike or stationary bike to build leg endurance and cardiovascular fitness with low impact.'),
  ('Rowing', 'Full-body pulling and leg-driving on a rowing machine that combines cardio with back and leg conditioning.'),
  ('Elliptical', 'A low-impact machine that mimics running motion while reducing joint stress.'),
  ('Stair Climber', 'Continuous stepping on a stair machine to build leg endurance and cardiovascular fitness.'),
  ('Jump Rope', 'Skipping rope at a steady or fast pace to build cardiovascular conditioning, coordination, and calf endurance.'),
  ('Swimming', 'Full-body, low-impact cardio performed in water across any stroke.'),
  ('Walking', 'Brisk walking at a steady pace to build cardiovascular base fitness with minimal joint impact.'),
  ('Incline Treadmill Walk', 'Walking on a treadmill set to an incline to raise the intensity of a walk without running.'),
  ('Sprint Intervals', 'Alternating short maximal-effort sprints with recovery periods to build speed and conditioning.')
) as v(name, description)
where e.name = v.name;

-- Expand the catalogue further, with descriptions from the start --------
insert into public.exercises (name, category, type, description) values
  -- Chest (strength)
  ('Flat Dumbbell Press', 'chest', 'strength', 'Press a dumbbell in each hand from chest height on a flat bench, allowing a deeper range of motion than a barbell press.'),
  ('Svend Press', 'chest', 'strength', 'Squeeze two plates together at chest height and press them forward to build constant chest tension without heavy load.'),
  ('Landmine Press', 'chest', 'strength', 'Press one end of a barbell anchored in a landmine attachment upward and forward, a shoulder-friendly pressing variation for the chest and shoulders.'),
  ('Floor Press', 'chest', 'strength', 'A bench press performed lying on the floor, which limits the range of motion and reduces shoulder strain while still building the chest and triceps.'),
  ('Low-to-High Cable Fly', 'chest', 'strength', 'Set the cables low and sweep the handles upward and together to target the upper chest.'),
  ('High-to-Low Cable Fly', 'chest', 'strength', 'Set the cables high and sweep the handles downward and together to target the lower chest.'),
  ('Smith Machine Bench Press', 'chest', 'strength', 'A bench press performed on a fixed vertical track, useful for controlled, spotter-free pressing.'),
  ('Plate Squeeze Press', 'chest', 'strength', 'Press two plates pinched together straight out from the chest to build inner-chest tension and stability.'),

  -- Back (strength)
  ('Wide-Grip Pull-Up', 'back', 'strength', 'A pull-up performed with a wider-than-shoulder hand placement to emphasize the outer lats.'),
  ('Neutral-Grip Lat Pulldown', 'back', 'strength', 'A lat pulldown using parallel handles, a shoulder-friendly grip that still builds the lats and biceps.'),
  ('Single-Arm Dumbbell Row', 'back', 'strength', 'Row a dumbbell with one arm while the other supports on a bench, building the lats and mid-back unilaterally.'),
  ('Pendlay Row', 'back', 'strength', 'A strict barbell row that starts from a dead stop on the floor each rep, building explosive back strength.'),
  ('Inverted Row', 'back', 'strength', 'Row your bodyweight up toward a fixed bar while hanging underneath it, a bodyweight alternative to the barbell row.'),
  ('Cable Pullover', 'back', 'strength', 'Pull a cable attachment from overhead down to the hips with straight arms to stretch and engage the lats.'),
  ('Reverse Fly', 'back', 'strength', 'Bent over with a dumbbell in each hand, raise the arms out to the sides to build the rear delts and upper back.'),
  ('Rack Pull', 'back', 'strength', 'A partial deadlift performed from knee height using a rack or blocks, overloading the upper back and traps.'),

  -- Legs (strength)
  ('Goblet Squat', 'legs', 'strength', 'Hold a single dumbbell or kettlebell at the chest and squat down, a beginner-friendly squat pattern for the quads and glutes.'),
  ('Sumo Deadlift', 'legs', 'strength', 'A wide-stance deadlift with the hands inside the legs, shifting more emphasis onto the inner thighs and glutes.'),
  ('Hack Squat', 'legs', 'strength', 'Squat against a fixed backward-angled sled on a machine to build the quads with a supported back.'),
  ('Step-Up', 'legs', 'strength', 'Step up onto an elevated platform with one leg at a time, building single-leg quad and glute strength.'),
  ('Walking Lunge', 'legs', 'strength', 'Alternate lunging steps forward across a distance, combining a strength and cardio stimulus for the legs.'),
  ('Glute Bridge', 'legs', 'strength', 'Lying on your back, drive the hips upward to isolate the glutes without the added load position of a hip thrust.'),
  ('Seated Calf Raise', 'legs', 'strength', 'Rise onto the toes with weight across the knees while seated, targeting the soleus portion of the calf.'),
  ('Good Morning', 'legs', 'strength', 'Hinge forward at the hips with a barbell across the upper back, building the hamstrings, glutes, and lower back.'),

  -- Arms (strength)
  ('Concentration Curl', 'arms', 'strength', 'Seated, brace the elbow against the inner thigh and curl a dumbbell to fully isolate the biceps.'),
  ('Incline Dumbbell Curl', 'arms', 'strength', 'Curl dumbbells while seated on an incline bench, stretching the biceps at the bottom of each rep.'),
  ('EZ-Bar Curl', 'arms', 'strength', 'A barbell curl using a zigzag bar that puts the wrists in a more comfortable angle.'),
  ('Zottman Curl', 'arms', 'strength', 'Curl the dumbbell up with palms facing forward, then rotate and lower it with palms facing back to target both the biceps and forearms.'),
  ('Cable Overhead Triceps Extension', 'arms', 'strength', 'Facing away from a low cable, extend the arms overhead to target the long head of the triceps.'),
  ('Diamond Push-Up', 'arms', 'strength', 'A push-up with the hands close together forming a diamond shape, shifting emphasis onto the triceps.'),
  ('Triceps Kickback', 'arms', 'strength', 'Hinged forward with the upper arm still, extend the forearm back to isolate the triceps.'),
  ('Bench Dip', 'arms', 'strength', 'Dip the body between two benches or a bench and the floor, using bodyweight to target the triceps.'),

  -- Cardio
  ('Assault Bike', 'cardio', 'cardio', 'A fan bike that scales resistance with effort, used for short, punishing high-intensity intervals.'),
  ('Battle Ropes', 'cardio', 'cardio', 'Whip heavy ropes in waves or slams for an upper-body-driven cardio and conditioning burst.'),
  ('Shadow Boxing', 'cardio', 'cardio', 'Throwing punches against no opponent at a steady pace to build cardio conditioning, footwork, and coordination.'),
  ('Stair Sprints', 'cardio', 'cardio', 'Sprinting up flights of stairs for short, intense bursts of leg-driven cardio.'),
  ('Hiking', 'cardio', 'cardio', 'Walking over outdoor terrain and elevation changes for low-impact endurance and leg conditioning.'),
  ('Kickboxing', 'cardio', 'cardio', 'Combining punches and kicks at pace for a full-body cardio and conditioning workout.'),
  ('Rucking', 'cardio', 'cardio', 'Walking at pace while carrying a weighted backpack, building endurance and leg and back strength together.'),
  ('HIIT Circuit', 'cardio', 'cardio', 'A rotating circuit of short, high-effort exercise bursts separated by brief rest, built for conditioning.')
on conflict (name) do nothing;
