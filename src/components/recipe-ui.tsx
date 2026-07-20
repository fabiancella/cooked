import { SymbolView } from 'expo-symbols';
import React, { PropsWithChildren } from 'react';
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
  PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Recipe } from '@/data/types';

export const palette = {
  cream: '#FFF8F0',
  paper: '#FFFFFF',
  ink: '#2A2118',
  muted: '#7D6E61',
  line: '#EADCCB',
  herb: '#41644A',
  tomato: '#D85A3A',
  butter: '#F4C95D',
  sage: '#EAF1E8',
};

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  scrollEnabled?: boolean;
  contentStyle?: ViewProps['style'];
  bottomPadding?: number;
}>;

export function Screen({ children, scroll = true, scrollEnabled = true, contentStyle, bottomPadding = 32 }: ScreenProps) {
  const contentStyles = [styles.content, { paddingBottom: bottomPadding }, contentStyle];

  if (!scroll) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={contentStyles}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top','left', 'right']} style={styles.safeArea}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentStyles}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}


export function Header({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={18} tintColor={palette.herb} />
    </Pressable>
  );
}

type ButtonProps = PressableProps &
  PropsWithChildren<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    icon?: React.ComponentProps<typeof SymbolView>['name'];
  }>;

export function AppButton({ children, variant = 'primary', icon, style, ...props }: ButtonProps) {
  const iconColor = variant === 'primary' ? palette.paper : variant === 'danger' ? palette.tomato : palette.ink;

  return (
    <Pressable
      {...props}
      style={(state) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'ghost' && styles.ghostButton,
        variant === 'danger' && styles.dangerButton,
        props.disabled && styles.disabledButton,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {icon ? <SymbolView name={icon} size={18} tintColor={iconColor} /> : null}
      <Text
        style={[
          styles.buttonText,
          variant === 'primary' && styles.primaryButtonText,
          variant === 'danger' && styles.dangerButtonText,
        ]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function KeyboardDoneAccessory() {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardWillShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (Platform.OS !== 'ios') {
    return null;
  }

  if (keyboardHeight <= 0) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.keyboardAccessoryOverlay, { bottom: keyboardHeight + 10 }]}>
      <Pressable
        accessibilityLabel="Dismiss keyboard"
        onPress={Keyboard.dismiss}
        style={({ pressed }) => [styles.keyboardDoneButton, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={34} tintColor="#007AFF" />
      </Pressable>
    </View>
  );
}

function getSourcePillBackground(source: string) {
  if (source.startsWith('TikTok')) {
    return '#FFE2D9';
  }

  if (source.startsWith('Instagram')) {
    return '#FFF2C7';
  }

  if (source === 'Screenshot') {
    return '#F7E0D2';
  }

  return '#FFF2DA';
}

export function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const sourcePillBackground = getSourcePillBackground(recipe.source);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <RecipeCardImage recipe={recipe} />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{recipe.title}</Text>
          <Text style={[styles.sourcePill, { backgroundColor: sourcePillBackground }]}>{recipe.source}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{recipe.cookTime}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{recipe.servings}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RecipeCardImage({ recipe }: { recipe: Recipe }) {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [recipe.imageUrl]);

  if (!recipe.imageUrl || imageFailed) {
    return (
      <View style={[styles.imageBlock, { backgroundColor: recipe.color }]}>
        <SymbolView name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }} size={30} tintColor={palette.paper} />
      </View>
    );
  }

  return (
    <Image
      onError={() => setImageFailed(true)}
      resizeMode="cover"
      source={{ uri: recipe.imageUrl }}
      style={styles.cardImage}
    />
  );
}

export function EditableField({
  compact = false,
  label,
  children,
}: PropsWithChildren<{ compact?: boolean; label: string }>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, compact && styles.compactFieldBox]}>
        {typeof children === 'string' ? <Text style={styles.fieldText}>{children}</Text> : children}
      </View>
    </View>
  );
}

export function PlaceholderImage({ color = palette.butter }: { color?: string }) {
  return (
    <View style={[styles.heroImage, { backgroundColor: color }]}>
      <SymbolView name={{ ios: 'photo', android: 'image', web: 'photo' }} size={34} tintColor={palette.paper} />
    </View>
  );
}

export function RecipeImage({ recipe }: { recipe: Recipe }) {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [recipe.imageUrl]);

  if (!recipe.imageUrl || imageFailed) {
    return <PlaceholderImage color={recipe.color} />;
  }

  return (
    <Image
      onError={() => setImageFailed(true)}
      resizeMode="cover"
      source={{ uri: recipe.imageUrl }}
      style={styles.heroPhoto}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  header: {
    gap: 7,
  },
  eyebrow: {
    color: palette.tomato,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 35,
    borderRadius: 12,
    backgroundColor: palette.sage,
    borderWidth: 1,
    borderColor: '#D4E1D0',
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  backButtonText: {
    color: palette.herb,
    fontSize: 15,
    fontWeight: '900',
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: palette.herb,
  },
  secondaryButton: {
    backgroundColor: palette.sage,
    borderWidth: 1,
    borderColor: '#D4E1D0',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  dangerButton: {
    backgroundColor: '#FFF1ED',
    borderWidth: 1,
    borderColor: '#F3C0B5',
  },
  buttonText: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  keyboardAccessoryOverlay: {
    position: 'absolute',
    right: 18,
    zIndex: 20,
  },
  keyboardDoneButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryButtonText: {
    color: palette.paper,
  },
  dangerButtonText: {
    color: palette.tomato,
  },
  pressed: {
    opacity: 0.72,
  },
  disabledButton: {
    opacity: 0.45,
  },
  card: {
    backgroundColor: palette.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
    shadowColor: '#3B2513',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  imageBlock: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  cardTitleRow: {
    gap: 10,
  },
  cardTitle: {
    color: palette.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  sourcePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  dot: {
    color: '#C4A990',
    fontSize: 14,
    fontWeight: '800',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  fieldBox: {
    backgroundColor: palette.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
  },
  compactFieldBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fieldText: {
    color: palette.ink,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  heroImage: {
    height: 220,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 18,
  },
});
