import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/ui/Feedback';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing, typography } from '@/theme';
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
const FOCUSES=['Chest','Back','Shoulders','Arms','Legs','Core','Full Body','Recovery / Rest'] as const;
export default function WorkoutPlanBuilderScreen(){
 const [daysPerWeek,setDaysPerWeek]=useState(4);
 const [plan,setPlan]=useState(()=>DAYS.map((day,index)=>({day,focus:index<4?FOCUSES[index]:'Recovery / Rest'})));
 const cycle=(index:number)=>setPlan(current=>current.map((item,i)=>i===index?{...item,focus:FOCUSES[(FOCUSES.indexOf(item.focus as typeof FOCUSES[number])+1)%FOCUSES.length]}:item));
 const save=async()=>{await AsyncStorage.setItem('aurasync_7day_plan',JSON.stringify({daysPerWeek,days:plan}));};
 return <Screen contentStyle={styles.content}><View style={styles.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color={colors.cyan}/></Pressable><View style={styles.headerCopy}><Text style={styles.eyebrow}>TRAINING PLAN</Text><Text style={styles.title}>My 7-Day Plan</Text></View></View>
 <Text style={styles.subtitle}>Choose how many days you train. Tap a day to change its focus.</Text><Text style={styles.label}>TRAINING DAYS / WEEK</Text>
 <View style={styles.selector}>{[2,3,4,5,6,7].map(n=><Pressable key={n} onPress={()=>setDaysPerWeek(n)} style={[styles.dayButton,daysPerWeek===n&&styles.active]}><Text style={[styles.dayText,daysPerWeek===n&&styles.activeText]}>{n}</Text></Pressable>)}</View>
 <View style={styles.list}>{plan.map((item,index)=><Pressable key={item.day} onPress={()=>cycle(index)} style={styles.row}><View style={styles.badge}><Text style={styles.badgeText}>{item.day.slice(0,3).toUpperCase()}</Text></View><View style={styles.copy}><Text style={styles.fullDay}>{item.day}</Text><Text style={styles.focus}>{item.focus}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.cyan}/></Pressable>)}</View>
 <Text style={styles.note}>Your plan is editable anytime. Rest and recovery days are always available.</Text><PrimaryButton label="SAVE 7-DAY PLAN" onPress={()=>void save()}/></Screen>;
}
const styles=StyleSheet.create({content:{gap:spacing.md},header:{flexDirection:'row',alignItems:'center',gap:spacing.md},headerCopy:{flex:1},eyebrow:{color:colors.cyan,fontSize:typography.label,fontWeight:'800',letterSpacing:.7},title:{color:colors.white,fontSize:typography.h1,fontWeight:'700'},subtitle:{color:colors.silver,fontSize:typography.body,lineHeight:20},label:{color:colors.muted,fontSize:typography.label,fontWeight:'800'},selector:{flexDirection:'row',gap:spacing.xs},dayButton:{flex:1,minHeight:42,borderRadius:radii.md,borderWidth:1,borderColor:colors.glassBorder,alignItems:'center',justifyContent:'center'},active:{backgroundColor:colors.cyan,borderColor:colors.cyan},dayText:{color:colors.silver,fontWeight:'800'},activeText:{color:colors.obsidian},list:{gap:spacing.sm},row:{flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,borderRadius:radii.md,borderWidth:1,borderColor:colors.glassBorder,backgroundColor:colors.glass},badge:{width:42,height:42,borderRadius:21,backgroundColor:'rgba(0,229,255,.1)',alignItems:'center',justifyContent:'center'},badgeText:{color:colors.cyan,fontSize:11,fontWeight:'800'},copy:{flex:1},fullDay:{color:colors.white,fontSize:typography.body,fontWeight:'700'},focus:{color:colors.silver,fontSize:typography.caption,marginTop:2},note:{color:colors.muted,fontSize:11,lineHeight:16,textAlign:'center'}});