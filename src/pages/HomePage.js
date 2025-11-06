// /src/pages/HomePage.jsx (VERSÃO 2.8 - ScrollView Adicionado)
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; // <-- Corrigido caminho
import { Settings, Award, ShieldCheck, Star, Swords, ChevronRight, Flame } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Circle } from 'react-native-svg';

// Chave e Default da Meta (Agora em Pontos)
const DAILY_GOAL_STORAGE_KEY = 'userDailyGoal';
const DEFAULT_DAILY_GOAL = 100; // Meta padrão de 100 pontos

// Paleta de Cores
const cores = {
    primary: "#00C853",       // Verde principal
    primaryLight: "#E6F8EB",
    primaryDark: "#00B048",
    textPrimary: "#1A202C",
    textSecondary: "#64748B",
    textLight: "#FFFFFF",
    background: "#F7FAFC",
    cardBackground: "#FFFFFF",
    border: "#E2E8F0",
    shadow: 'rgba(0, 0, 0, 0.05)',
    orange: '#F59E0B',
    orangeLight: '#FFFBEB',
};

// Componente Card de Trilha
const TrilhaCard = ({ icon: Icon, title, onPress }) => (
    <TouchableOpacity style={styles.trilhaCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.trilhaIconContainer}>
            <Icon size={24} color={cores.primary} />
        </View>
        <Text style={styles.trilhaTitle}>{title}</Text>
    </TouchableOpacity>
);

// Componente para o card "Continue"
const ContinueCard = ({ lastStudyName, onPress }) => (
    <TouchableOpacity style={styles.continueCard} activeOpacity={0.8} onPress={onPress}>
       <View style={styles.continueContent}>
         <Text style={styles.continueCardTitle}>Continue de onde parou</Text>
         <Text style={styles.continueCardSubtitle}>
           {lastStudyName ? `Último estudo: ${lastStudyName}` : 'Explore as trilhas'}
         </Text>
       </View>
       <ChevronRight size={24} color={'rgba(255, 255, 255, 0.5)'} style={styles.continueCardIcon} />
    </TouchableOpacity>
);


export default function HomePage() {
    const [currentPoints, setCurrentPoints] = useState(0); // Renomeado para pontos
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [currentDailyGoal, setCurrentDailyGoal] = useState(DEFAULT_DAILY_GOAL);
    const [lastStudied, setLastStudied] = useState(null);
    const [studyStreak, setStudyStreak] = useState(0);
    const navigation = useNavigation();
    const { user } = useAuth();
    const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Estudante';
    const getLocalDateString = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Função para carregar dados da home (pontos, meta, streak)
    const loadHomeData = React.useCallback(async () => {
        let savedProgress = 0;
        let goal = user?.user_metadata?.daily_goal || DEFAULT_DAILY_GOAL;
        if (typeof goal !== 'number' || isNaN(goal) || goal <= 0) { goal = DEFAULT_DAILY_GOAL; }
        setCurrentDailyGoal(goal);

        const today = getLocalDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        try {
            // 1. Carrega progresso diário (PONTOS do Supabase)
            const progressMeta = user?.user_metadata?.daily_progress;
            if (progressMeta && progressMeta.date === today) {
                savedProgress = progressMeta.count;
            }

            // 2. Carrega último estudo (AsyncStorage)
            const storedTrail = await AsyncStorage.getItem('lastStudiedTrail');
            if (storedTrail) {
                setLastStudied(JSON.parse(storedTrail));
            }

            // 3. Carrega o STREAK (Supabase)
            const streakMeta = user?.user_metadata?.study_streak;
            let finalStreakCount = 0;
            if (streakMeta && (streakMeta.lastStudiedDate === today || streakMeta.lastStudiedDate === yesterdayString)) {
                finalStreakCount = streakMeta.count;
            }
            setStudyStreak(finalStreakCount);

        } catch (e) { console.error("Erro ao ler dados da home:", e); }

        setCurrentPoints(savedProgress);
        const percentage = goal > 0 ? Math.min(100, (savedProgress / goal) * 100) : 0;
        setProgressPercentage(percentage);
    }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            loadHomeData();
        }, [loadHomeData])
    );

    // Funções de Navegação

    const irParaCpa10Hub = () => { navigation.navigate("cpa10-hub"); };
    const irParaCpa20Hub = () => { navigation.navigate("cpa20-hub"); };
    const irParaCeaHub = () => { navigation.navigate("cea-hub"); };

    const irParaCpaHub = () => navigation.navigate("cpa-hub");
    const irParaCprorHub = () => navigation.navigate("cpror-hub");
    const irParaCproiHub = () => navigation.navigate("cproi-hub");

    // Navegação do card "Continue"
    const handleContinueStudy = () => {
        if (lastStudied) {
            if (lastStudied.name.includes('CPA')) navigation.navigate('cpa-hub');
            else if (lastStudied.name.includes('C-PRO R')) navigation.navigate('cpror-hub');
            else if (lastStudied.name.includes('C-PRO I')) navigation.navigate('cproi-hub');
            else navigation.navigate('Trilhas');
        } else {
            navigation.navigate('Trilhas');
        }
    };

    // Gráfico
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progressPercentage / 100);

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* ======================================================= */}
            {/* ☆ MUDANÇA ☆: View -> ScrollView                       */}
            {/* Adicionado showsVerticalScrollIndicator={false}        */}
            {/* Adicionado contentContainerStyle                     */}
            {/* ======================================================= */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mainContainer}
            >

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerGreeting}>Olá,</Text>
                        <Text style={styles.headerName}>{userName}!</Text>
                    </View>
                    <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Settings')}>
                        <Settings size={26} color={cores.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Card Grande - Meta Diária (já ajustado para pontos) */}
                <View style={styles.dailyGoalCard}>
                    <View style={styles.goalTextContainer}>
                        <Text style={styles.goalValue}>{currentPoints}</Text>
                        <Text style={styles.goalLabel}>de {currentDailyGoal} pontos hoje</Text>
                    </View>
                    <View style={styles.goalProgressCircle}>
                        <Svg width="100%" height="100%" viewBox="0 0 74 74">
                            <Circle cx="37" cy="37" r={radius} stroke={cores.border} strokeWidth="7" fill={cores.cardBackground} />
                            <Circle
                                cx="37" cy="37" r={radius} stroke={cores.primary} strokeWidth="7" fill="none"
                                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                originX="37" originY="37" rotation="-90"
                            />
                        </Svg>
                        <Text style={styles.goalPercentageText}>{Math.round(progressPercentage)}%</Text>
                    </View>
                </View>

                {/* Secção Trilhas */}
                <View style={styles.trilhasSection}>
                    <Text style={styles.sectionTitle}>Trilhas</Text>

                    <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.trilhasScrollContainer}
                    >
                        <TrilhaCard icon={Award} title="CPA-10" onPress={irParaCpa10Hub} />
                        <TrilhaCard icon={Award} title="CPA-20" onPress={irParaCpa20Hub} />
                        <TrilhaCard icon={Award} title="CEA" onPress={irParaCeaHub} />
                        <TrilhaCard icon={ShieldCheck} title="CPA" onPress={irParaCpaHub} />
                        <TrilhaCard icon={ShieldCheck} title="C-PRO R" onPress={irParaCprorHub} />
                        <TrilhaCard icon={Star} title="C-PRO I" onPress={irParaCproiHub} />
                    </ScrollView>
                </View>

                {/* Card Continue Seus Estudos */}
                <ContinueCard
                    lastStudyName={lastStudied?.name}
                    onPress={handleContinueStudy}
                />

                {/* SEÇÃO "EM FOCO" */}
                <View style={styles.focusSection}>
                     <Text style={styles.sectionTitle}>Em Foco</Text>

                     {/* Card 1: Streak */}
                     <TouchableOpacity style={styles.infoCard} activeOpacity={0.7}>
                         <View style={styles.streakIconContainer}>
                             <Flame size={20} color={cores.orange} />
                         </View>
                         <View style={styles.infoCardTextContainer}>
                            <Text style={styles.streakValue}>{studyStreak}</Text>
                            <Text style={styles.streakLabel}>dias de ofensiva</Text>
                         </View>
                     </TouchableOpacity>

                     {/* Card 2: Desafio Semanal */}
                     <TouchableOpacity style={[styles.infoCard, { marginTop: 12 }]} activeOpacity={0.7}>
                        <View style={styles.desafioIconContainer}><Swords size={22} color={cores.primary} /></View>
                        <View style={styles.infoCardTextContainer}>
                            <Text style={styles.desafioTitle}>Desafio Semanal</Text>
                            <Text style={styles.desafioSubtitle} numberOfLines={1}>Especialista em Fundos</Text>
                        </View>
                        <ChevronRight size={22} color={cores.textSecondary} />
                     </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// StyleSheet
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: cores.background,
        paddingTop: Platform.OS === 'android' ? 25 : 0, // Removido padding 16 do topo aqui
    },
    // =======================================================
    // ☆ MUDANÇA ☆: mainContainer agora é contentContainerStyle
    // Adicionado flexGrow: 1 para garantir que ocupe a tela
    // Removido flex: 1
    // =======================================================
    mainContainer: {
        flexGrow: 1, // Permite que o conteúdo cresça e cause scroll
        paddingHorizontal: 20,
        paddingBottom: 25, // Aumentado padding inferior para dar espaço no scroll
        justifyContent: 'flex-start',
        gap: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16, // Padding do topo apenas no header
    },
    headerGreeting: { fontSize: 18, color: cores.textSecondary, marginBottom: -4 },
    headerName: { fontSize: 24, fontWeight: 'bold', color: cores.textPrimary },
    headerButton: { padding: 4 },
    dailyGoalCard: {
        backgroundColor: cores.cardBackground,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: cores.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 15, elevation: 5,
    },
    goalTextContainer: { flexShrink: 1 },
    goalValue: { fontSize: 44, fontWeight: 'bold', color: cores.textPrimary, lineHeight: 50 },
    goalLabel: { fontSize: 14, color: cores.textSecondary, marginTop: 0 },
    goalProgressCircle: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
    goalPercentageText: { position: 'absolute', fontSize: 15, fontWeight: 'bold', color: cores.primary },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: cores.textPrimary,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    trilhasSection: { /* Apenas estrutura */ },
    trilhasScrollContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 4, // Espaço para a sombra do card
    },
    trilhaCard: {
        // flex: 1, // <-- REMOVIDO
        width: 95, // <-- ADICIONADO (Tamanho fixo)
        backgroundColor: cores.cardBackground,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: cores.border,
        // Adiciona uma leve sombra
        shadowColor: cores.shadow, 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 1, 
        shadowRadius: 5, 
        elevation: 3,
    },
    trilhaIconContainer: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: cores.primaryLight,
        justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    trilhaTitle: { fontSize: 12, fontWeight: 'bold', color: cores.textPrimary, textAlign: 'center' },

    // Card Continue (Verde)
    continueCard: {
        backgroundColor: cores.primary,
        borderRadius: 16, padding: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        overflow: 'hidden', elevation: 3,
    },
    continueContent: { flex: 1 },
    continueCardTitle: { color: cores.textLight, fontWeight: 'bold', fontSize: 16 },
    continueCardSubtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, marginTop: 2 },
    continueCardIcon: { marginLeft: 8 },

    // ESTILOS DE "EM FOCO"
    focusSection: { },
    infoCard: {
        backgroundColor: cores.cardBackground,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: cores.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 5,
    },
    streakIconContainer: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: cores.orangeLight,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    infoCardTextContainer: { flex: 1, },
    streakValue: { fontSize: 20, fontWeight: 'bold', color: cores.textPrimary, },
    streakLabel: { fontSize: 13, color: cores.textSecondary, },
    desafioIconContainer: {
        width: 40, height: 40, borderRadius: 10, backgroundColor: cores.primaryLight,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    desafioTitle: { fontSize: 15, fontWeight: 'bold', color: cores.textPrimary },
    desafioSubtitle: { fontSize: 13, color: cores.textSecondary },
});