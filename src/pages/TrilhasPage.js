// /src/pages/TrilhasPage.jsx (Versão 2.0 - Padronizada com a HomePage)
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Award, Star, ShieldCheck, ChevronRight } from "lucide-react-native";

// =======================================================
// 1. PALETA DE CORES ATUALIZADA (da HomePage.js)
// =======================================================
const cores = {
    primary: "#00C853",
    primaryLight: "#E6F8EB",
    primaryDark: "#00B048",
    textPrimary: "#1A202C",   // Títulos e texto principal
    textSecondary: "#64748B", // Subtítulos e descrições
    textLight: "#FFFFFF",
    background: "#F7FAFC",    // Fundo cinza-claro
    cardBackground: "#FFFFFF", // Fundo dos cards
    border: "#E2E8F0",
    shadow: 'rgba(0, 0, 0, 0.05)',
};

export default function TrilhasPage() {
  const navigation = useNavigation();

  const irParaCpaHub = () => { navigation.navigate("cpa-hub"); };
  const irParaCprorHub = () => { navigation.navigate("cpror-hub"); };
  const irParaCproiHub = () => { navigation.navigate("cproi-hub"); };
  const irParaCpa10Hub = () => { navigation.navigate("cpa10-hub"); };
  const irParaCpa20Hub = () => { navigation.navigate("cpa20-hub"); };
  const irParaCeaHub = () => { navigation.navigate("cea-hub"); };

  return (
    // =======================================================
    // 2. FUNDO ATUALIZADO (cinza-claro)
    // =======================================================
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header (agora sem borda e com fundo cinza-claro) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trilhas de Estudo</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        // =======================================================
        // 3. LAYOUT PADRONIZADO (padding 20 e gap 16)
        // =======================================================
        contentContainerStyle={styles.container}
      >
        <Text style={styles.description}>
          Selecione a certificação que você está estudando.
        </Text>

        {/* Card: CPA-10 (Ativo) -> Vai para cpa10-hub */}
        <TouchableOpacity
          style={styles.card}
          onPress={irParaCpa10Hub}>
          <View style={styles.iconContainer}>
            <Award color={cores.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Certificação CPA-10</Text>
            <Text style={styles.cardSubtitle}>
              Acesse os módulos de estudo
            </Text>
          </View>
          <ChevronRight color={cores.textSecondary} />
        </TouchableOpacity>

        {/* Card: CPA-20 (Ativo) -> Vai para cpa20-hub */}
        <TouchableOpacity
          style={styles.card}
          onPress={irParaCpa20Hub}>
          <View style={styles.iconContainer}>
            <Award color={cores.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Certificação CPA-20</Text>
            <Text style={styles.cardSubtitle}>
              Acesse os módulos de estudo
            </Text>
          </View>
          <ChevronRight color={cores.textSecondary} />
        </TouchableOpacity>
        
        {/* Card: CEA (Ativo) -> Vai para cea-hub */}
        <TouchableOpacity
          style={styles.card}
          onPress={irParaCeaHub}>
          <View style={styles.iconContainer}>
            <Award color={cores.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Certificação CEA</Text>
            <Text style={styles.cardSubtitle}>
              Acesse os módulos de estudo
            </Text>
          </View>
          <ChevronRight color={cores.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={irParaCpaHub}>
          <View style={styles.iconContainer}>
            <Award color={cores.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Certificação CPA</Text>
            <Text style={styles.cardSubtitle}>
              Acesse os módulos de estudo
            </Text>
          </View>
          <ChevronRight color={cores.textSecondary} />
        </TouchableOpacity>

        {/* Card 2: C-Pro R (Ativo) -> Vai para cpror-hub */}
        <TouchableOpacity
          style={styles.card}
          onPress={irParaCprorHub}>
          <View style={styles.iconContainer}>
            <ShieldCheck color={cores.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Certificação C-Pro R</Text>
            <Text style={styles.cardSubtitle}>
              Acesse os módulos de estudo
            </Text>
          </View>
          <ChevronRight color={cores.textSecondary} />
        </TouchableOpacity>

        {/* Card 3: C-PRO I (Ativo) -> Vai para cproi-hub */}
        <TouchableOpacity
          style={styles.card}
          onPress={irParaCproiHub}>
          <View style={styles.iconContainer}>
            <Star color={cores.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Certificação C-PRO I</Text>
            <Text style={styles.cardSubtitle}>
              Acesse os módulos de estudo
            </Text>
          </View>
          <ChevronRight color={cores.textSecondary} />
        </TouchableOpacity>

        {/* Card 4: Ancord (Inativo) */}
        <View style={[styles.card, styles.cardDisabled]}>
          <View style={[styles.iconContainer, styles.iconDisabled]}>
            <Award color={cores.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Certificação Ancord</Text>
            <Text style={styles.cardSubtitle}>Em breve</Text>
          </View>
          <ChevronRight color={cores.textSecondary} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =======================================================
// 5. ESTILOS COMPLETAMENTE REFEITOS
// =======================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: cores.background, // Fundo cinza-claro
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    paddingHorizontal: 20, // Padrão da HomePage
    paddingTop: 32,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.background, // Fundo cinza-claro (sem borda)
  },
  headerTitle: {
    fontSize: 24, // Título maior, como na HomePage
    fontWeight: "bold",
    color: cores.textPrimary, // Cor padronizada
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20, // Padrão da HomePage
    paddingBottom: 24,
    gap: 16, // Espaçamento entre todos os itens
  },
  description: {
    fontSize: 14,
    color: cores.textSecondary, // Cor padronizada
    marginBottom: 8, // Reduzido pois o 'gap' do container cuida do resto
  },
  card: {
    backgroundColor: cores.cardBackground, // Fundo branco
    padding: 20, // Mais espaçamento interno
    borderRadius: 20, // Mais arredondado (padrão HomePage)
    flexDirection: "row",
    alignItems: "center",
    gap: 16, // Espaço interno
    // Sombra idêntica à da HomePage
    shadowColor: cores.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },
  cardDisabled: {
    opacity: 0.7,
    backgroundColor: cores.cardBackground, // Mantém branco, mas com opacidade
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24, // Círculo perfeito
    backgroundColor: cores.primaryLight, // Cor padronizada
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconDisabled: {
      backgroundColor: cores.border, // Fundo cinza para ícone desabilitado
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: cores.textPrimary, // Cor padronizada
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14, // Levemente maior
    color: cores.textSecondary, // Cor padronizada
  },
});