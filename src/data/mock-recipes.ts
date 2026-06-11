export type Recipe = {
  id: string;
  userId?: string;
  title: string;
  cookTime: string;
  servings: string;
  source: string;
  sourceText?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  color: string;
  ingredients: string[];
  steps: string[];
};

export const mockRecipes: Recipe[] = [
  {
    id: 'lemon-rigatoni',
    title: 'Creamy Lemon Rigatoni',
    cookTime: '25 min',
    servings: '4 servings',
    source: 'Instagram',
    color: '#F6C453',
    ingredients: [
      '12 oz rigatoni',
      '1 lemon, zested and juiced',
      '3/4 cup grated parmesan',
      '1/2 cup pasta water',
      '2 tbsp butter',
      'Black pepper and salt',
    ],
    steps: [
      'Boil the rigatoni in salted water until al dente.',
      'Melt butter in a skillet, then add lemon zest and pepper.',
      'Toss pasta with parmesan, lemon juice, and pasta water until glossy.',
      'Season to taste and serve warm.',
    ],
  },
  {
    id: 'miso-salmon-bowls',
    title: 'Miso Salmon Bowls',
    cookTime: '30 min',
    servings: '2 servings',
    source: 'TikTok',
    color: '#F18F7A',
    ingredients: [
      '2 salmon fillets',
      '2 tbsp white miso',
      '1 tbsp honey',
      '1 tbsp soy sauce',
      '2 cups cooked rice',
      'Cucumber, avocado, and sesame seeds',
    ],
    steps: [
      'Whisk miso, honey, and soy sauce into a glaze.',
      'Brush salmon with glaze and bake until flaky.',
      'Build bowls with rice, salmon, cucumber, and avocado.',
      'Top with sesame seeds before serving.',
    ],
  },
  {
    id: 'chickpea-harissa-stew',
    title: 'Chickpea Harissa Stew',
    cookTime: '35 min',
    servings: '3 servings',
    source: 'Screenshot',
    color: '#C86738',
    ingredients: [
      '2 cans chickpeas, drained',
      '1 onion, diced',
      '2 cloves garlic',
      '2 tbsp harissa paste',
      '1 can crushed tomatoes',
      '1 cup vegetable stock',
    ],
    steps: [
      'Cook onion and garlic until soft.',
      'Stir in harissa, chickpeas, tomatoes, and stock.',
      'Simmer until thick and flavorful.',
      'Serve with herbs, yogurt, or crusty bread.',
    ],
  },
];

export const formattedMockRecipe: Recipe = {
  id: 'formatted-preview',
  title: 'Golden Skillet Chicken',
  cookTime: '40 min',
  servings: '4 servings',
  source: 'Pasted text',
  color: '#E7A458',
  ingredients: [
    '1 1/2 lb chicken thighs',
    '1 tbsp olive oil',
    '1 tsp smoked paprika',
    '1 cup chicken stock',
    '1/2 cup cream',
    '2 cups baby spinach',
  ],
  steps: [
    'Season chicken with salt, pepper, and smoked paprika.',
    'Sear chicken in olive oil until golden on both sides.',
    'Add stock and simmer until the chicken is cooked through.',
    'Stir in cream and spinach, then cook until silky.',
  ],
};
