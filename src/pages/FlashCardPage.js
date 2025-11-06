// /src/pages/FlashCardPage.js (VERSÃO FINAL - Conectada ao Supabase)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView, // Importar o ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase, useAuth } from '../context/AuthContext'; // Importa o Supabase e useAuth
import { 
  POINT_RULES, 
  updateUserProgressAndStreak 
} from '../utils/PointSystem'; // Importa o PointSystem
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react-native';

// Paleta de cores
const cores = {
  primary: '#00C853',
  secondary: '#1A202C',
  softGray: '#F7FAFC',
  gray200: '#E2E8F0',
  gray500: '#64748B',
  gray700: '#334155',
  light: '#FFFFFF',
  red50: '#FEE2E2',
  red600: '#DC2626',
  green50: '#F0FDF4',
  green600: '#16A34A',
  blue50: '#EFF6FF',
  blue600: '#2563EB',
};

// Constante para o limite de cards por sessão
const REVIEW_LIMIT = 20;

export default function FlashCardPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth(); // Pega o usuário do hook useAuth
  
  const { certificationType } = route.params;

  // Estados de loading/erro
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deck, setDeck] = useState([]); // Começa vazio
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Estado de loading para salvar

  // Efeito para buscar os cards
  useEffect(() => {
    const fetchCards = async () => {
      if (!certificationType) {
        setError('Tipo de prova não definido.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // CHAMA A RPC
        const { data, error: rpcError } = await supabase.rpc(
          'fn_get_flashcards_for_review',
          {
            p_prova: certificationType,
            p_limit: REVIEW_LIMIT,
          }
        );

        if (rpcError) throw rpcError;

        setDeck(data || []);
        
      } catch (err) {
        console.error('Erro ao buscar flash cards:', err);
        setError(err.message || 'Ocorreu um erro ao carregar os cards.');
      } finally {
        setLoading(false);
        // Reseta o estado da página
        setCurrentCardIndex(0);
        setIsFlipped(false);
      }
    };

    fetchCards();
  }, [certificationType]); // Busca novamente se a prova mudar

  // Ações do Usuário
  const handleFlipCard = () => {
    if (isSaving) return; // Não vira se estiver salvando
    setIsFlipped(!isFlipped);
  };

  // Função de salvar progresso (com lógica de pontos)
  const handleReviewAnswer = async (rating) => {
    if (isSaving) return; // Previne cliques duplos
    
    setIsSaving(true);
    const cardToUpdate = deck[currentCardIndex];
    
    try {
      // CHAMA A RPC
      const { error: rpcError } = await supabase.rpc(
        'fn_update_flashcard_progress',
        {
          p_flash_card_id: cardToUpdate.flash_card_id,
          p_rating: rating,
        }
      );
      
      if (rpcError) throw rpcError;

      // Lógica de Pontos
      let pointsToAdd = 0;
      switch (rating) {
        case 1: // Errei
          pointsToAdd = POINT_RULES.FLASHCARD_WRONG;
          break;
        case 2: // Bom
          pointsToAdd = POINT_RULES.FLASHCARD_GOOD;
          break;
        case 3: // Fácil
          pointsToAdd = POINT_RULES.FLASHCARD_EASY;
          break;
      }

      // Atualiza os pontos e o streak do usuário
      if (pointsToAdd > 0) {
        await updateUserProgressAndStreak(user, pointsToAdd);
      }
      
      // Sucesso! Avança para o próximo card
      setIsFlipped(false);
      setCurrentCardIndex(currentCardIndex + 1);
      
    } catch (err) {
      console.error('Erro ao salvar progresso do flash card:', err);
      // Opcional: mostrar um alerta para o usuário
      // Alert.alert("Erro", "Não foi possível salvar seu progresso. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };
  
  
  // --- Telas de Estado (Loading, Erro) ---

  if (loading) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator size="large" color={cores.primary} />
        <Text style={styles.loadingText}>Carregando cards...</Text>
      </View>
    );
  }

  if (error) {
     return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorText}>Oops! Algo deu errado.</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
          <Text style={styles.btnPrimaryText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Tela de Conclusão (Se acabar os cards ou se o deck veio vazio) ---
  
  // Se o baralho estava vazio desde o início
  if (!loading && deck.length === 0) {
     return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <ArrowLeft size={24} color={cores.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Flash Cards</Text>
        </View>
        <View style={styles.centeredScreen}>
          <Check size={60} color={cores.primary} />
          <Text style={styles.mainTitle}>Tudo certo por aqui!</Text>
          <Text style={styles.mainSubtitle}>
            Nenhum card novo ou para revisão encontrado para {certificationType.toUpperCase()}.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
            <Text style={styles.btnPrimaryText}>Voltar ao Hub</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
     );
  }
  
  // Se o usuário revisou todos os cards do baralho
  if (currentCardIndex >= deck.length) {
     return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <X size={24} color={cores.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Flash Cards</Text>
        </View>
        <View style={styles.centeredScreen}>
          <Check size={60} color={cores.primary} />
          <Text style={styles.mainTitle}>Revisão Concluída!</Text>
          <Text style={styles.mainSubtitle}>
            Você revisou {deck.length} {deck.length === 1 ? 'card' : 'cards'}.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
            <Text style={styles.btnPrimaryText}>Voltar ao Hub</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
     );
  }
  
  // --- Tela Principal (Revisão) ---

  const currentCard = deck[currentCardIndex];
  const progressPercentage = ((currentCardIndex + 1) / deck.length) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header (com progresso) */}
        <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                <ArrowLeft size={24} color={cores.secondary} />
              </TouchableOpacity>
              <Text style={styles.progressTextInfo}>
                {currentCardIndex + 1} / {deck.length}
              </Text>
              <View style={{width: 24}} />
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFg, { width: `${progressPercentage}%` }]} />
            </View>
        </View>

        {/* Corpo (O Card) */}
        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={handleFlipCard}
            disabled={isSaving} // Desabilita o "virar" enquanto salva
          >
            {/* Mostra a FRENTE (Pergunta) */}
            {!isFlipped && (
              <View style={styles.cardFace}>
                <Text style={styles.cardFrontText}>
                  {currentCard.front}
                </Text>
              </View>
            )}
            
            {/* Mostra o VERSO (Resposta) */}
            {isFlipped && (
              <View style={styles.cardFace}>
                <Text style={styles.cardBackText}>
                  {currentCard.back}
                </Text>
              </View>
            )}
            
            {/* Indicador de Virar */}
            <View style={styles.flipIndicator}>
                <RotateCcw size={16} color={cores.gray500} />
                <Text style={styles.flipText}>
                  {isFlipped ? 'Ver Pergunta' : 'Ver Resposta'}
                </Text>
            </View>
            
          </TouchableOpacity>
        </ScrollView>
        
        {/* Footer (Botões de Ação) */}
        <View style={styles.footer}>
          {!isFlipped && (
            <TouchableOpacity
              style={[styles.btnPrimary, isSaving && styles.btnDisabled]}
              onPress={handleFlipCard}
              disabled={isSaving}
            >
              <Text style={styles.btnPrimaryText}>Virar Card</Text>
            </TouchableOpacity>
          )}
          
          {isFlipped && (
            <View style={styles.srsButtonsContainer}>
              <TouchableOpacity
                style={[styles.btnSrs, styles.btnSrsRed, isSaving && styles.btnDisabled]}
                onPress={() => handleReviewAnswer(1)} // 1 = Errei
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={cores.red600} /> : <Text style={[styles.btnSrsText, styles.btnSrsTextRed]}>Errei</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btnSrs, styles.btnSrsBlue, isSaving && styles.btnDisabled]}
                onPress={() => handleReviewAnswer(2)} // 2 = Bom
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={cores.blue600} /> : <Text style={[styles.btnSrsText, styles.btnSrsTextBlue]}>Bom</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btnSrs, styles.btnSrsGreen, isSaving && styles.btnDisabled]}
                onPress={() => handleReviewAnswer(3)} // 3 = Fácil
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color={cores.green600} /> : <Text style={[styles.btnSrsText, styles.btnSrsTextGreen]}>Fácil</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View> 
    </SafeAreaView>
  );
}

// Estilos (Código completo)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: cores.softGray, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  container: { flex: 1 },
  // Telas de Estado
  centeredScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: cores.softGray },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: cores.gray500 },
  errorText: { fontSize: 18, fontWeight: 'bold', color: cores.red600, textAlign: 'center' },
  errorSubtitle: { marginTop: 8, fontSize: 14, color: cores.gray500, textAlign: 'center', marginBottom: 24 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: cores.secondary, textAlign: 'center', marginBottom: 8 },
  mainSubtitle: { fontSize: 15, color: cores.gray500, textAlign: 'center', marginBottom: 32 },

  // Header
  header: { backgroundColor: cores.light, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: cores.gray200 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: cores.secondary },
  closeButton: { padding: 4 },
  progressTextInfo: { fontSize: 14, fontWeight: '600', color: cores.gray500 },
  progressBarBg: { height: 6, backgroundColor: cores.gray200, borderRadius: 3 },
  progressBarFg: { height: 6, backgroundColor: cores.primary, borderRadius: 3 },
  
  // Conteúdo Principal
  mainScroll: { flex: 1 },
  mainContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  
  // Card
  card: {
    backgroundColor: cores.light,
    borderRadius: 24,
    minHeight: 350,
    borderWidth: 1,
    borderColor: cores.gray200,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardFace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFrontText: {
    fontSize: 22,
    fontWeight: '600',
    color: cores.secondary,
    textAlign: 'center',
    lineHeight: 30,
  },
  cardBackText: {
    fontSize: 18,
    fontWeight: '500',
    color: cores.gray700,
    textAlign: 'center',
    lineHeight: 26,
  },
  flipIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    bottom: 20,
    opacity: 0.6,
  },
  flipText: {
    fontSize: 14,
    color: cores.gray500,
    fontWeight: '500',
  },

  // Footer
  footer: { 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    borderTopWidth: 1, 
    borderColor: cores.gray200, 
    padding: 16, 
    paddingBottom: Platform.OS === 'ios' ? 32 : 16 
  },
  
  // Botões
  btnPrimary: { 
    backgroundColor: cores.primary, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  btnPrimaryText: { color: cores.light, fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { // Estilo para desabilitar
    opacity: 0.7,
  },
  
  // Botões SRS
  srsButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSrs: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minHeight: 48, // Altura mínima para o ActivityIndicator
  },
  btnSrsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Vermelho
  btnSrsRed: { backgroundColor: cores.red50, borderColor: cores.red600 },
  btnSrsTextRed: { color: cores.red600 },
  
  // Azul
  btnSrsBlue: { backgroundColor: cores.blue50, borderColor: cores.blue600 },
  btnSrsTextBlue: { color: cores.blue600 },
  
  // Verde
  btnSrsGreen: { backgroundColor: cores.green50, borderColor: cores.green600 },
  btnSrsTextGreen: { color: cores.green600 },
});