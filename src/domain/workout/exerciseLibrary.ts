export type ExerciseCategory =
  | 'Chest' | 'Back' | 'Shoulders' | 'Biceps' | 'Triceps' | 'Forearms / Grip'
  | 'Quads' | 'Hamstrings / Glutes' | 'Calves' | 'Core / Abs / Obliques'
  | 'Traps / Neck' | 'Conditioning / Full Body';

export interface ExerciseDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: ExerciseCategory;
  readonly defaultSets: number;
  readonly defaultReps: number;
}

const groups: readonly [ExerciseCategory, string[]][] = [
['Chest',['Barbell bench press','Incline barbell bench press','Decline barbell bench press','Dumbbell flat press','Incline dumbbell press','Decline dumbbell press','Push-ups','Weighted dips — chest lean','Cable fly high-to-low','Cable fly low-to-high','Pec deck','Dumbbell fly']],
['Back',['Pull-ups','Chin-ups','Wide-grip lat pulldown','Close-grip lat pulldown','Barbell bent-over row','Pendlay row','T-bar row','One-arm dumbbell row','Seated cable row','Chest-supported row','Straight-arm pulldown','Rack pulls','Deadlift','Hyperextension']],
['Shoulders',['Standing barbell overhead press','Seated dumbbell shoulder press','Arnold press','Machine shoulder press','Dumbbell lateral raise','Cable lateral raise','Front raise','Rear-delt dumbbell fly','Reverse pec deck','Upright row','Landmine press','Pike push-up']],
['Biceps',['Barbell curl','EZ-bar curl','Dumbbell curl','Hammer curl','Preacher curl','Incline dumbbell curl','Cable curl']],
['Triceps',['Close-grip bench press','Skull crushers','Rope pushdown','Straight-bar pushdown','Overhead dumbbell triceps extension','Overhead cable triceps extension','Dumbbell kickback','Triceps dips — upright']],
['Forearms / Grip',['Wrist curls','Reverse wrist curls','Farmer’s carry','Dead hang','Plate pinch']],
['Quads',['Back squat','Front squat','Box squat','Bulgarian split squat','Walking lunges','Reverse lunges','Leg press','Hack squat','Goblet squat','Leg extension']],
['Hamstrings / Glutes',['Romanian deadlift','Stiff-leg deadlift','Sumo deadlift','Good morning','Lying leg curl','Seated leg curl','Nordic curl','Glute bridge','Barbell hip thrust','Cable pull-through','Hip abduction machine','Hip adduction machine','Glute kickback']],
['Calves',['Standing calf raise','Seated calf raise','Donkey calf raise','Leg press calf raise']],
['Core / Abs / Obliques',['Crunch','Hanging leg raise','Hanging knee raise','Cable crunch','Plank','Side plank','Russian twist','Ab wheel rollout','Dragon flag','Pallof press']],
['Traps / Neck',['Barbell shrug','Dumbbell shrug','Neck harness extension/flexion']],
['Conditioning / Full Body',['Kettlebell swings','Burpees']],
];

export const EXERCISE_LIBRARY: readonly ExerciseDefinition[] = groups.flatMap(([category, names]) =>
  names.map((name, index) => ({
    id: `${category.toLowerCase().replace(/[^a-z]+/g,'-')}-${index+1}`,
    name, category, defaultSets: 3, defaultReps: category === 'Conditioning / Full Body' ? 12 : 10,
  })),
);

export const EXERCISE_CATEGORIES = groups.map(([category]) => category);
