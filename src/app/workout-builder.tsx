import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { EXERCISE_CATEGORIES, EXERCISE_LIBRARY, type ExerciseCategory } from '@/domain/workout/exerciseLibrary';
import { colors, radii, spacing, typography } from '@/theme';

interface Selected { id: string; name: string; sets: number; reps: number; category: ExerciseCategory; }

export default function WorkoutBuilderScreen() {
  const [category, setCategory] = useState<ExerciseCategory>('Conditioning / Full Body');
  const [selected, setSelected] = useState<Selected[]>([]);
  const [query, setQuery] = useState('');
  const exercises = useMemo(
    () =>
      query.trim()
        ? EXERCISE_LIBRARY.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
        : EXERCISE_LIBRARY.filter((e) => e.category === category),
    [category, query],
  );

  const toggle = (id: string) => {
    const exercise = EXERCISE_LIBRARY.find(e => e.id === id);
    if (!exercise) return;
    setSelected(current => current.some(x => x.id === id)
      ? current.filter(x => x.id !== id)
      : [...current, { id, name: exercise.name, category: exercise.category, sets: exercise.defaultSets, reps: exercise.defaultReps }]);
  };
  const start = async () => {
    await AsyncStorage.setItem('aurasync_active_custom_workout', JSON.stringify(selected));
    router.push('/active-workout');
  };
  const update = (id: string, key: 'sets'|'reps', delta: number) =>
    setSelected(current => current.map(x => x.id === id ? { ...x, [key]: Math.max(1, Math.min(30, x[key] + delta)) } : x));

  return <Screen scroll={false} contentStyle={styles.screen}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.cyan}/></Pressable>
      <View style={styles.headerCopy}><Text style={styles.eyebrow}>WORKOUT BUILDER</Text><Text style={styles.title}>Build Your Workout</Text></View>
      <View style={styles.count}><Text style={styles.countText}>{selected.length}</Text></View>
    </View>
    <Text style={styles.question}>What do you want to train today?</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {EXERCISE_CATEGORIES.map(c => <Pressable key={c} onPress={() => {setCategory(c);setQuery('')}} style={[styles.chip, category===c && styles.chipActive]}><Text style={[styles.chipText, category===c && styles.chipTextActive]}>{c}</Text></Pressable>)}
    </ScrollView>
    <TextInput value={query} onChangeText={setQuery} placeholder="Search exercises" placeholderTextColor={colors.muted} style={styles.search}/>
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
      {exercises.map(ex => { const isSelected=selected.some(x=>x.id===ex.id); return <Pressable key={ex.id} onPress={()=>toggle(ex.id)} style={[styles.exercise,isSelected&&styles.exerciseSelected]}>
        <View style={styles.icon}><Ionicons name={isSelected?'checkmark':'barbell-outline'} size={18} color={isSelected?colors.obsidian:colors.cyan}/></View>
        <Text style={styles.exerciseName}>{ex.name}</Text><Text style={styles.scheme}>{ex.defaultSets} × {ex.defaultReps}</Text>
      </Pressable>})}
      {selected.length>0 && <GlassCard style={styles.configure}><Text style={styles.section}>YOUR WORKOUT</Text>{selected.map(x=><View key={x.id} style={styles.row}><View style={styles.rowCopy}><Text style={styles.rowName}>{x.name}</Text><Text style={styles.rowCategory}>{x.category}</Text></View><View style={styles.controls}><Pressable onPress={()=>update(x.id,'sets',-1)} style={styles.control}><Text style={styles.controlText}>−</Text></Pressable><Text style={styles.value}>{x.sets}S</Text><Pressable onPress={()=>update(x.id,'sets',1)} style={styles.control}><Text style={styles.controlText}>+</Text></Pressable><Pressable onPress={()=>update(x.id,'reps',-1)} style={styles.control}><Text style={styles.controlText}>−</Text></Pressable><Text style={styles.value}>{x.reps}R</Text><Pressable onPress={()=>update(x.id,'reps',1)} style={styles.control}><Text style={styles.controlText}>+</Text></Pressable></View></View>)}</GlassCard>}
    </ScrollView>
    <PrimaryButton label={selected.length ? `START WORKOUT · ${selected.length} EXERCISES` : 'SELECT EXERCISES TO START'} disabled={!selected.length} onPress={() => void start()} />
  </Screen>;
}
const styles=StyleSheet.create({
 screen:{flex:1,gap:spacing.md,paddingBottom:spacing.md},header:{flexDirection:'row',alignItems:'center',gap:spacing.md},headerCopy:{flex:1},eyebrow:{color:colors.cyan,fontSize:typography.label,fontWeight:'800',letterSpacing:.7},title:{color:colors.white,fontSize:typography.h1,fontWeight:'700'},count:{width:34,height:34,borderRadius:17,backgroundColor:'rgba(0,229,255,.12)',alignItems:'center',justifyContent:'center'},countText:{color:colors.cyan,fontWeight:'800'},question:{color:colors.white,fontSize:typography.h2,fontWeight:'700'},chips:{gap:spacing.xs,paddingBottom:spacing.xs},chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:radii.pill,borderWidth:1,borderColor:colors.glassBorder},chipActive:{backgroundColor:colors.cyan,borderColor:colors.cyan},chipText:{color:colors.silver,fontSize:12,fontWeight:'700'},chipTextActive:{color:colors.obsidian},search:{height:46,borderRadius:radii.md,borderWidth:1,borderColor:colors.glassBorder,backgroundColor:colors.glass,color:colors.white,paddingHorizontal:14},list:{flex:1},listContent:{gap:spacing.xs,paddingBottom:spacing.md},exercise:{minHeight:54,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:10,borderRadius:radii.md,borderWidth:1,borderColor:'transparent',backgroundColor:'rgba(6,35,38,.45)'},exerciseSelected:{borderColor:colors.cyan,backgroundColor:'rgba(0,229,255,.09)'},icon:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,229,255,.1)'},exerciseName:{flex:1,color:colors.white,fontSize:14,fontWeight:'600'},scheme:{color:colors.muted,fontSize:12},configure:{gap:spacing.sm},section:{color:colors.cyan,fontSize:12,fontWeight:'800',letterSpacing:.7},row:{gap:8},rowCopy:{flexDirection:'row',justifyContent:'space-between',gap:8},rowName:{flex:1,color:colors.white,fontSize:13,fontWeight:'600'},rowCategory:{color:colors.muted,fontSize:11},controls:{flexDirection:'row',alignItems:'center',gap:6},control:{width:32,height:32,borderRadius:16,borderWidth:1,borderColor:colors.glassBorder,alignItems:'center',justifyContent:'center'},controlText:{color:colors.cyan,fontSize:20},value:{color:colors.white,fontSize:12,fontWeight:'800',minWidth:28,textAlign:'center'}
});