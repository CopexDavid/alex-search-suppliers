// Маппинг категорий товаров на специализированные сайты

export interface CategoryMapping {
  id: string;
  name: string;
  icon: string;
  sites: string[];
  searchTerms: string[];
}

// Категории товаров и соответствующие им сайты
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    id: 'construction',
    name: 'Строительные материалы',
    icon: '🔨',
    sites: [
      'murash.kz',
      'solideng.kz',
      'megastroy.kz',
      'all-tools.kz'
    ],
    searchTerms: [
      'строительные материалы',
      'цемент',
      'кирпич',
      'арматура',
      'бетон',
      'краска',
      'плитка',
      'ламинат',
      'гипсокартон',
      'утеплитель',
      'кровля'
    ]
  },
  {
    id: 'electrical',
    name: 'Электрические товары',
    icon: '🔌',
    sites: [
      'ekt.kz',
      'nur-electro.kz',
      'electrotech.kz',
      'all-tools.kz'
    ],
    searchTerms: [
      'электрические товары',
      'электротехника',
      'блок питания',
      'трансформатор',
      'кабель',
      'провод',
      'розетка',
      'выключатель',
      'светодиод',
      'резистор',
      'конденсатор'
    ]
  },
  {
    id: 'kipia',
    name: 'Товары для КИПиА и автоматизации оборудовании',
    icon: '⚙️',
    sites: [
      'lunda.kz',
      'npp-gamma.kz',
      'promsnabkz.com'
    ],
    searchTerms: [
      'КИПиА',
      'автоматизация',
      'датчик',
      'контроллер',
      'реле',
      'преобразователь',
      'измерительное оборудование',
      'система автоматизации'
    ]
  },
  {
    id: 'tools',
    name: 'Инструменты',
    icon: '🔧',
    sites: [
      'tssp.kz',
      'all-tools.kz',
      'itool.kz'
    ],
    searchTerms: [
      'инструменты',
      'ручной инструмент',
      'электроинструмент',
      'дрель',
      'шуруповерт',
      'болгарка',
      'перфоратор',
      'отвертка',
      'ключ',
      'молоток'
    ]
  },
  {
    id: 'automotive',
    name: 'Запасные части автомашин',
    icon: '🚗',
    sites: [
      'kaztruckshop.kz',
      'shop.truckmotors.kz',
      'pnevmoservis.kz'
    ],
    searchTerms: [
      'запчасти',
      'автозапчасти',
      'запасные части',
      'фильтр',
      'масло',
      'тормозные колодки',
      'свечи',
      'аккумулятор',
      'шины',
      'диски',
      'амортизатор'
    ]
  },
  {
    id: 'laboratory',
    name: 'Лабораторные товары',
    icon: '🔬',
    sites: [
      'mn-lab.kz',
      'nv-lab.kz',
      'kazlabpribor.kz'
    ],
    searchTerms: [
      'лабораторные товары',
      'лабораторное оборудование',
      'микроскоп',
      'весы',
      'центрифуга',
      'термостат',
      'автоклав',
      'пипетка',
      'колба',
      'реактив',
      'пробирка'
    ]
  },
  {
    id: 'it',
    name: 'Компьютерная техника и переферия',
    icon: '💻',
    sites: [
      'itmag.kz',
      'moon.kz',
      'acomputers.kz'
    ],
    searchTerms: [
      'компьютерная техника',
      'периферия',
      'компьютер',
      'ноутбук',
      'монитор',
      'клавиатура',
      'мышь',
      'принтер',
      'сканер',
      'веб-камера'
    ]
  },
  {
    id: 'metal',
    name: 'Металлопрокат',
    icon: '⚒️',
    sites: [
      'sheber-ug.kz',
      'exportural.kz',
      'stalnayamarka.kz'
    ],
    searchTerms: [
      'металлопрокат',
      'металл',
      'сталь',
      'арматура',
      'труба',
      'лист',
      'швеллер',
      'уголок',
      'балка',
      'профиль'
    ]
  }
];

/**
 * Получает категорию по ID
 */
export function getCategoryById(id: string): CategoryMapping | undefined {
  return CATEGORY_MAPPINGS.find(category => category.id === id);
}

/**
 * Получает сайты для указанных категорий
 */
export function getSitesForCategories(categoryIds: string[]): string[] {
  const sites = new Set<string>();
  
  categoryIds.forEach(categoryId => {
    const category = getCategoryById(categoryId);
    if (category) {
      category.sites.forEach(site => sites.add(site));
    }
  });
  
  return Array.from(sites);
}

/**
 * Проверяет, относится ли URL к указанным категориям
 */
export function isUrlInCategories(url: string, categoryIds: string[]): boolean {
  if (categoryIds.length === 0) return true; // Если категории не выбраны, разрешаем все
  
  const allowedSites = getSitesForCategories(categoryIds);
  const lowercaseUrl = url.toLowerCase();
  
  return allowedSites.some(site => lowercaseUrl.includes(site.toLowerCase()));
}

/**
 * Фильтрует результаты поиска по категориям
 */
export function filterByCategories(results: any[], categoryIds: string[]): any[] {
  if (categoryIds.length === 0) return results; // Если категории не выбраны, возвращаем все
  
  return results.filter(result => {
    const url = result.url || result.link || '';
    return isUrlInCategories(url, categoryIds);
  });
}

/**
 * Генерирует поисковые запросы с учетом категорий
 * Добавляет сайты к словам поиска для поиска по этим сайтам
 */
export function enhanceQueryWithCategories(originalQuery: string, categoryIds: string[]): string[] {
  if (categoryIds.length === 0) return [originalQuery];
  
  const queries: string[] = [];
  const allSites: string[] = [];
  
  // Собираем все сайты из выбранных категорий
  categoryIds.forEach(categoryId => {
    const category = getCategoryById(categoryId);
    if (category) {
      category.sites.forEach(site => {
        if (!allSites.includes(site)) {
          allSites.push(site);
        }
      });
    }
  });
  
  // Добавляем базовый запрос с сайтами
  if (allSites.length > 0) {
    // Добавляем все сайты к запросу как ключевые слова
    const sitesQuery = allSites.join(' ');
    queries.push(`${originalQuery} ${sitesQuery}`);
    
    // Также добавляем варианты с site: для более точного поиска
    allSites.forEach(site => {
      queries.push(`${originalQuery} site:${site}`);
    });
  } else {
    queries.push(originalQuery);
  }
  
  // Добавляем запросы с терминами категорий
  categoryIds.forEach(categoryId => {
    const category = getCategoryById(categoryId);
    if (category) {
      category.searchTerms.forEach(term => {
        if (!originalQuery.toLowerCase().includes(term.toLowerCase())) {
          queries.push(`${originalQuery} ${term}`);
        }
      });
    }
  });
  
  return queries;
}
