// Утилита для фильтрации результатов поиска по регионам

// Домены Казахстана
const KAZAKHSTAN_DOMAINS = [
  '.kz',
  'kaspi.kz',
  'satu.kz',
  'olx.kz',
  'kolesa.kz',
  'market.kz',
  'technodom.kz',
  'sulpak.kz',
  'alser.kz',
  'shop.kz',
  'almaty.kz',
  'astana.kz',
  'shymkent.kz',
  'aktobe.kz',
  'atyrau.kz',
  'kostanay.kz',
  'pavlodar.kz',
  'karaganda.kz',
  'taraz.kz',
  'ust-kamenogorsk.kz',
  'petropavlovsk.kz',
  'aktau.kz',
  'kokshetau.kz',
  'taldykorgan.kz',
  'turkistan.kz',
  'elis.kz',
  'elis-k.satu.kz',
  '1-u.kz',
  'mbc.kz'
]

// Домены России
const RUSSIA_DOMAINS = [
  '.ru',
  '.рф',
  'yandex.ru',
  'mail.ru',
  'avito.ru',
  'wildberries.ru',
  'ozon.ru',
  'aliexpress.ru',
  'market.yandex.ru',
  'dns-shop.ru',
  'citilink.ru',
  'mvideo.ru',
  'eldorado.ru',
  'techport.ru',
  'regard.ru',
  'nix.ru',
  'computeruniverse.ru',
  'supereyes.ru'
]

// Украинские домены (исключаем)
const UKRAINE_DOMAINS = [
  '.ua',
  '.укр',
  'prom.ua',
  'olx.ua',
  'rozetka.com.ua',
  'hotline.ua',
  'allo.ua',
  'foxtrot.com.ua',
  'comfy.ua',
  'eldorado.ua',
  'citrus.ua',
  'brain.com.ua',
  'marketpro.in.ua'
]

// Белорусские домены (исключаем)
const BELARUS_DOMAINS = [
  '.by',
  '.бел',
  'onliner.by',
  'deal.by',
  'shop.by',
  'market.by'
]

// Другие домены для исключения
const EXCLUDED_DOMAINS = [
  '.com.ua',
  '.kiev.ua',
  '.lviv.ua',
  '.odessa.ua',
  '.kharkiv.ua',
  '.dnipro.ua',
  '.zaporizhzhia.ua',
  '.vinnytsia.ua',
  '.chernivtsi.ua',
  '.ternopil.ua',
  '.rivne.ua',
  '.lutsk.ua',
  '.uzhgorod.ua',
  '.cherkasy.ua',
  '.chernihiv.ua',
  '.sumy.ua',
  '.poltava.ua',
  '.kremenchuk.ua',
  '.bila-tserkva.ua',
  '.mariupol.ua',
  '.kramatorsk.ua',
  '.sloviansk.ua',
  '.melitopol.ua',
  '.berdyansk.ua',
  '.nikopol.ua',
  '.pavlohrad.ua',
  '.kamianske.ua',
  '.kryvyi-rih.ua'
]

export type SearchRegion = 'KAZAKHSTAN' | 'CIS'

/**
 * Определяет регион по URL
 */
export function getRegionFromUrl(url: string): 'KAZAKHSTAN' | 'RUSSIA' | 'UKRAINE' | 'BELARUS' | 'OTHER' {
  const lowercaseUrl = url.toLowerCase()
  
  // Проверяем украинские домены
  if (UKRAINE_DOMAINS.some(domain => lowercaseUrl.includes(domain)) || 
      EXCLUDED_DOMAINS.some(domain => lowercaseUrl.includes(domain))) {
    return 'UKRAINE'
  }
  
  // Проверяем белорусские домены
  if (BELARUS_DOMAINS.some(domain => lowercaseUrl.includes(domain))) {
    return 'BELARUS'
  }
  
  // Проверяем казахстанские домены
  if (KAZAKHSTAN_DOMAINS.some(domain => lowercaseUrl.includes(domain))) {
    return 'KAZAKHSTAN'
  }
  
  // Проверяем российские домены
  if (RUSSIA_DOMAINS.some(domain => lowercaseUrl.includes(domain))) {
    return 'RUSSIA'
  }
  
  return 'OTHER'
}

/**
 * Фильтрует результаты поиска по региону
 */
export function filterByRegion(results: any[], searchRegion: SearchRegion): any[] {
  return results.filter(result => {
    const url = result.url || result.link || ''
    const region = getRegionFromUrl(url)
    
    switch (searchRegion) {
      case 'KAZAKHSTAN':
        // Только Казахстан
        return region === 'KAZAKHSTAN'
      
      case 'CIS':
        // Казахстан + Россия
        return region === 'KAZAKHSTAN' || region === 'RUSSIA'
      
      default:
        return true
    }
  })
}

/**
 * Проверяет, разрешен ли домен для указанного региона
 */
export function isAllowedDomain(url: string, searchRegion: SearchRegion): boolean {
  const region = getRegionFromUrl(url)
  
  switch (searchRegion) {
    case 'KAZAKHSTAN':
      return region === 'KAZAKHSTAN'
    
    case 'CIS':
      return region === 'KAZAKHSTAN' || region === 'RUSSIA'
    
    default:
      return true
  }
}

/**
 * Получает цвет бейджа для региона
 */
export function getRegionBadgeColor(url: string): { color: string; text: string } {
  const region = getRegionFromUrl(url)
  
  switch (region) {
    case 'KAZAKHSTAN':
      return { color: 'bg-green-600', text: '🇰🇿 KZ' }
    case 'RUSSIA':
      return { color: 'bg-blue-600', text: '🇷🇺 RU' }
    case 'UKRAINE':
      return { color: 'bg-yellow-600', text: '🇺🇦 UA' }
    case 'BELARUS':
      return { color: 'bg-red-600', text: '🇧🇾 BY' }
    default:
      return { color: 'bg-gray-600', text: '🌐 OTHER' }
  }
}
