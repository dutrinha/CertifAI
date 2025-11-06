// src/screens/SettingsScreen.jsx (Versão 2.2 - Com Texto de Ajuda)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase, useAuth } from '../context/AuthContext'; // Caminho corrigido
import { ArrowLeft, LogOut, User, Target } from 'lucide-react-native';
import { POINT_RULES } from '../utils/PointSystem';

// =======================================================
// 1. PALETA DE CORES ATUALIZADA (da HomePage.js)
// =======================================================
const cores = {
  primary: "#00C853",
  primaryLight: "#E6F8EB",
  textPrimary: "#1A202C",
  textSecondary: "#64748B",
  textLight: "#FFFFFF",
  background: "#F7FAFC",      // Fundo cinza-claro
  cardBackground: "#FFFFFF",   // Fundo dos cards
  border: "#E2E8F0",
  shadow: 'rgba(0, 0, 0, 0.05)',
  redText: '#DC2626',
};

// =======================================================
// ☆ MUDANÇA ☆: Default da Meta
// =======================================================
const DEFAULT_DAILY_GOAL = 100; // Alterado de 20 para 100

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth(); 

  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [dailyGoalInput, setDailyGoalInput] = useState(
    (user?.user_metadata?.daily_goal || DEFAULT_DAILY_GOAL).toString()
  );

  // =======================================================
  // 2. NOVO ESTADO DE LOADING (um para todos)
  // =======================================================
  // Controla o indicador de atividade de salvamento
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza o estado local se o 'user' do AuthContext mudar
  useEffect(() => {
    // Só atualiza se não estiver no meio de um salvamento
    if (user && !isSaving) {
      setName(user.user_metadata?.full_name || '');
      // =======================================================
      // ☆ MUDANÇA ☆: Usa o novo default
      // =======================================================
      setDailyGoalInput((user.user_metadata?.daily_goal || DEFAULT_DAILY_GOAL).toString());
    }
  }, [user, isSaving]); // Depende do objeto 'user'

  // =======================================================
  // 3. FUNÇÕES DE UPDATE (sem botões, com 'onEndEditing')
  // =======================================================
  
  // Salva nome no Supabase (chamado ao sair do campo)
  const handleUpdateName = async () => {
    const trimmedName = name.trim();
    const currentName = user?.user_metadata?.full_name || '';

    // Não faz nada se o nome não mudou
    if (trimmedName === currentName) return; 
    
    // Validação
    if (!trimmedName) { 
      Alert.alert('Erro', 'O nome não pode ficar em branco.'); 
      setName(currentName); // Restaura o nome anterior
      return; 
    }
    
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmedName } 
    });
    
    if (error) { 
      Alert.alert('Erro', 'Não foi possível atualizar o nome.'); 
      console.error("Erro nome:", error);
      setName(currentName); // Restaura em caso de erro
    }
    // O 'useEffect' vai atualizar o estado quando o 'user' for atualizado
    setIsSaving(false);
  };

  // Salva meta diária no Supabase (chamado ao sair do campo)
  const handleUpdateGoal = async () => {
    const goalNumber = parseInt(dailyGoalInput, 10);
    // =======================================================
    // ☆ MUDANÇA ☆: Usa o novo default
    // =======================================================
    const currentGoal = (user?.user_metadata?.daily_goal || DEFAULT_DAILY_GOAL);
    const currentGoalString = currentGoal.toString();

    // Não faz nada se a meta não mudou
    if (dailyGoalInput === currentGoalString || goalNumber === currentGoal) return;

    // Validação
    if (isNaN(goalNumber) || !Number.isInteger(goalNumber) || goalNumber <= 0) {
      Alert.alert('Meta Inválida', 'Insira um número inteiro maior que zero.');
      setDailyGoalInput(currentGoalString); // Restaura a meta anterior
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { daily_goal: goalNumber } 
    });

    if (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a meta diária.');
      console.error("Erro ao atualizar meta:", error);
      setDailyGoalInput(currentGoalString); // Restaura em caso de erro
    }
    // O 'useEffect' vai atualizar o estado
    setIsSaving(false);
  };

  // Logout (com a correção do navigation.replace que fizemos)
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Erro', 'Não foi possível sair da conta. Tente novamente.');
    } else {
      navigation.replace('Auth');
    }
  };

  return (
    // =======================================================
    // 4. LAYOUT ATUALIZADO (Fundo cinza, header limpo)
    // =======================================================
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={cores.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled" // Permite fechar teclado ao tocar fora
      >
        {/* --- Seção Perfil --- */}
        <Text style={styles.sectionTitle}>PERFIL</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <User size={20} color={cores.textSecondary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Seu nome" 
              value={name} 
              onChangeText={setName} 
              autoCapitalize="words" 
              editable={!isSaving}
              onEndEditing={handleUpdateName} // <-- SALVA AO SAIR
              onBlur={handleUpdateName}
              placeholderTextColor={cores.textSecondary}
            />
            {/* Indicador de salvamento */}
            {isSaving && <ActivityIndicator size="small" color={cores.primary} />}
          </View>
        </View>

        {/* --- Seção Metas --- */}
        <Text style={styles.sectionTitle}>METAS</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Target size={20} color={cores.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              // =======================================================
              // ☆ MUDANÇA ☆: Placeholder "questões" -> "pontos"
              // =======================================================
              placeholder="Meta diária (pontos)"
              value={dailyGoalInput} 
              onChangeText={setDailyGoalInput} 
              keyboardType="number-pad"
              returnKeyType="done"
              editable={!isSaving}
              onEndEditing={handleUpdateGoal} // <-- SALVA AO SAIR
              onBlur={handleUpdateGoal} // <-- CORRIGIDO (estava handleUpdateName)
              placeholderTextColor={cores.textSecondary}
            />
            {isSaving && <ActivityIndicator size="small" color={cores.primary} />}
          </View>
          
          <View style={styles.helperContainer}>
            <Text style={styles.helperText}>
              Lembrete da pontuação:
              {'\n'}• Múltipla Escolha: <Text style={{fontWeight: 'bold'}}>{POINT_RULES.MC_CORRECT} pts</Text> (acerto), <Text style={{fontWeight: 'bold'}}>{POINT_RULES.MC_INCORRECT} pts</Text> (erro)
              {'\n'}• Cases: <Text style={{fontWeight: 'bold'}}>{POINT_RULES.CASE_CORRECT} pts</Text> (correto), <Text style={{fontWeight: 'bold'}}>{POINT_RULES.CASE_PARTIAL} pts</Text> (parcial), <Text style={{fontWeight: 'bold'}}>{POINT_RULES.CASE_INCORRECT} pts</Text> (erro)
              {'\n'}• Interativas: Pontuação final da atividade
            </Text>
          </View>

        </View>
        
        {/* --- Botão Logout (agora estilizado como card) --- */}
        <Text style={styles.sectionTitle}>CONTA</Text>
        <TouchableOpacity style={styles.card} onPress={handleLogout}>
            <View style={styles.logoutRow}>
                <LogOut size={20} color={cores.redText} />
                <Text style={styles.logoutButtonText}>Sair da Conta</Text>
            </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// =======================================================
// 5. ESTILOS COMPLETAMENTE REFEITOS
// =======================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.background }, // Fundo geral
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    backgroundColor: cores.background, 
    gap: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: cores.textPrimary },
  content: { 
    flex: 1, 
    paddingTop: 8,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: cores.textSecondary, 
    paddingHorizontal: 4, 
    marginBottom: -8, // Aproxima o título do card
    textTransform: 'uppercase', 
  },
  card: { 
    backgroundColor: cores.cardBackground, 
    borderRadius: 20, 
    // Sombra Padrão
    shadowColor: cores.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 8, // Padding vertical menor
  },
  inputIcon: { marginRight: 16 },
  input: { 
    flex: 1, 
    height: 48, // Altura fixa
    fontSize: 16, 
    color: cores.textPrimary,
    fontWeight: '500',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16, // Espaço entre ícone e texto
  },
  logoutButtonText: { 
    color: cores.redText, 
    fontSize: 16, 
    fontWeight: 'bold', 
  },
  // =======================================================
  // ☆ NOVO ☆: Estilos para o texto de ajuda
  // =======================================================
  helperContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: cores.border,
    marginHorizontal: 16, // Para alinhar com o padding do inputRow
  },
  helperText: {
    fontSize: 13,
    color: cores.textSecondary,
    lineHeight: 18,
  },
});