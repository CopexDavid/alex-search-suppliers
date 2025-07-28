'use client';

import { useState } from 'react';
import { SearchResult } from '@/types/search';
import {
  Search,
  Building2,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  Globe,
  Mail,
  Loader2,
  Play,
  RotateCcw,
  Eye,
  CheckCircle,
  XCircle,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const REGIONS = {
  kz: {
    name: "Казахстан",
    flag: "🇰🇿",
    searchSuffix: "купить оптом казахстан"
  },
  ru: {
    name: "Россия",
    flag: "🇷🇺",
    searchSuffix: "купить оптом россия"
  },
  global: {
    name: "Глобально",
    flag: "🌐",
    searchSuffix: "buy wholesale"
  }
} as const;

type RegionKey = keyof typeof REGIONS;

const SEARCH_STEPS = [
  { 
    name: "Поиск поставщиков в Google", 
    message: "Ищем поставщиков в Google...",
    duration: 2000 
  },
  { 
    name: "Проверка надежности", 
    message: "Проверяем надежность компаний...",
    duration: 2000 
  },
  { 
    name: "Извлечение контактов", 
    message: "Извлекаем контактные данные...",
    duration: 3000 
  },
  { 
    name: "Проверка WhatsApp", 
    message: "Проверяем наличие WhatsApp...",
    duration: 2000 
  }
];

const COUNTRY_INFO = {
  kz: {
    name: "Казахстан",
    flag: "🇰🇿",
    color: "bg-blue-500"
  },
  ru: {
    name: "Россия",
    flag: "🇷🇺",
    color: "bg-red-500"
  },
  cn: {
    name: "Китай",
    flag: "🇨🇳",
    color: "bg-yellow-600"
  },
  com: {
    name: "Международный",
    flag: "🌐",
    color: "bg-purple-500"
  }
} as const;

function getCountryFromUrl(url: string): { name: string; flag: string; color: string } {
  try {
    const hostname = new URL(url).hostname;
    const domain = hostname.split('.').pop()?.toLowerCase();
    
    // Проверяем специальные случаи для китайских доменов
    if (hostname.includes('.cn') || hostname.includes('.alibaba.') || hostname.includes('.1688.')) {
      return COUNTRY_INFO.cn;
    }
    
    return COUNTRY_INFO[domain as keyof typeof COUNTRY_INFO] || COUNTRY_INFO.com;
  } catch {
    return COUNTRY_INFO.com;
  }
}

export default function SearchProcessPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>('kz');
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [foundCompanies, setFoundCompanies] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [currentMessage, setCurrentMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const enhanceSearchQuery = (query: string, region: RegionKey) => {
    const suffix = REGIONS[region].searchSuffix;
    if (query.toLowerCase().includes(suffix.toLowerCase())) {
      return query;
    }
    return `${query} ${suffix}`;
  };

  const startSearch = async () => {
    setIsSearching(true);
    setSearchProgress(0);
    setCurrentStep(0);
    setFoundCompanies([]);
    setError('');

    const enhancedQuery = enhanceSearchQuery(searchQuery, selectedRegion);
    console.log('Enhanced query:', enhancedQuery);

    // Запускаем анимацию и реальный поиск параллельно
    const searchPromise = fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ searchQuery: enhancedQuery }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Произошла ошибка при поиске');
      }
      return data;
    });

    // Анимация прогресса
    let elapsed = 0;
    const totalDuration = SEARCH_STEPS.reduce((sum, step) => sum + step.duration, 0);

    for (let i = 0; i < SEARCH_STEPS.length; i++) {
      const step = SEARCH_STEPS[i];
      setCurrentStep(i);
      setCurrentMessage(step.message);
      
      await new Promise(resolve => setTimeout(resolve, step.duration));
      
      elapsed += step.duration;
      setSearchProgress((elapsed / totalDuration) * 90); // Оставляем 10% для финального этапа
    }

    try {
      const data = await searchPromise;
      setFoundCompanies(data.results);
      setSearchProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при поиске');
      setSearchProgress(100);
    } finally {
      setIsSearching(false);
      setCurrentStep(-1);
      setCurrentMessage("");
    }
  };

  const getContactStatusBadge = (status: string) => {
    switch (status) {
      case "extracted":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            WhatsApp найден
          </Badge>
        );
      case "no_whatsapp":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Нет WhatsApp
          </Badge>
        );
      case "extracting":
        return (
          <Badge variant="outline">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Извлечение...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Ожидание
          </Badge>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    const colors = {
      Google: "bg-blue-600",
      "2GIS": "bg-green-600",
      Яндекс: "bg-red-600",
      Каталог: "bg-purple-600",
    };
    return <Badge className={colors[source as keyof typeof colors] || "bg-gray-600"}>{source}</Badge>;
  };

  const whatsappCompanies = foundCompanies.filter((c) => c.whatsapp);
  const totalFound = foundCompanies.length;
  const withContacts = foundCompanies.filter((c) => c.phone).length;
  const withWhatsApp = whatsappCompanies.length;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Search className="mr-3 h-8 w-8 text-primary" />
            Поисковый процесс
          </h1>
          <p className="text-muted-foreground mt-1">Автоматический поиск и извлечение контактов поставщиков</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={startSearch} disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Поиск...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Запустить поиск
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Сброс
          </Button>
        </div>
      </div>

      {/* Поисковый запрос */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Поисковый запрос</CardTitle>
          <CardDescription>Выберите регион поиска и введите ключевые слова</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {Object.entries(REGIONS).map(([key, region]) => (
              <Button
                key={key}
                variant={selectedRegion === key ? "default" : "outline"}
                className="flex items-center gap-2"
                onClick={() => setSelectedRegion(key as RegionKey)}
              >
                <span className="text-lg">{region.flag}</span>
                <span>{region.name}</span>
              </Button>
            ))}
          </div>
          <div className="flex space-x-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Например: набивка сальниковая асбестовая 8*8 (будет искать в ${REGIONS[selectedRegion].name})`}
              className="flex-1"
            />
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Прогресс поиска */}
      {(isSearching || foundCompanies.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Прогресс поиска</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {isSearching ? currentMessage || SEARCH_STEPS[currentStep]?.name : "Поиск завершен"}
                </span>
                <span className="text-sm text-muted-foreground">{Math.round(searchProgress)}%</span>
              </div>
              <Progress value={searchProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-blue-600">{totalFound}</div>
                <div className="text-xs text-muted-foreground">Найдено компаний</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-green-600">{withContacts}</div>
                <div className="text-xs text-muted-foreground">С контактами</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-purple-600">{withWhatsApp}</div>
                <div className="text-xs text-muted-foreground">С WhatsApp</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-orange-600">
                  {withWhatsApp > 0 ? Math.round((withWhatsApp / totalFound) * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Успешность</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Результаты поиска */}
      {foundCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Найденные поставщики</CardTitle>
                <CardDescription>
                  Найдено {totalFound} компаний, {withWhatsApp} с WhatsApp номерами
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Всего: {totalFound}</Badge>
                <Badge variant="default">WhatsApp: {withWhatsApp}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="grid gap-4">
                {foundCompanies.map((company, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg transition-all ${
                      company.whatsapp ? "border-green-200 bg-green-50/30" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Building2 className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{company.companyName || company.title || 'Компания'}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{company.description || company.snippet}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {company.address && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{company.address}</span>
                            </div>
                            )}
                            {company.foundAt && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Найден в {company.foundAt}</span>
                            </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getSourceBadge('Google')}
                        {getContactStatusBadge(company.whatsapp ? 'extracted' : 'no_whatsapp')}
                        {company.url && (
                          <Badge className={`${getCountryFromUrl(company.url).color} flex items-center gap-1`}>
                            <span>{getCountryFromUrl(company.url).flag}</span>
                            <span>{getCountryFromUrl(company.url).name}</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      {company.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Телефон</p>
                            <p className="text-sm font-medium">{company.phone}</p>
                          </div>
                        </div>
                      )}
                      {company.whatsapp && (
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">WhatsApp</p>
                            <a 
                              href={company.whatsapp.startsWith('http') ? company.whatsapp : `https://wa.me/${company.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-green-600 hover:underline"
                            >
                              {company.whatsapp}
                            </a>
                          </div>
                        </div>
                      )}
                      {company.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-sm font-medium">{company.email}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center space-x-4">
                        {company.url && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Globe className="h-3 w-3" />
                            <a href={company.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {new URL(company.url).hostname}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {company.whatsapp && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Отправить запрос
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Отправка запроса в WhatsApp</DialogTitle>
                                <DialogDescription>
                                  Отправить коммерческий запрос компании {company.companyName || company.title}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-3 bg-muted rounded">
                                  <p className="text-sm">
                                    <strong>Получатель:</strong> {company.companyName || company.title}
                                    <br />
                                    <strong>WhatsApp:</strong> {company.whatsapp}
                                    <br />
                                    <strong>Контакт:</strong> {company.phone}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium">Сообщение:</label>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className={cn(
                                        "flex items-center gap-2 transition-all duration-200",
                                        isGenerating && "bg-muted cursor-not-allowed opacity-80"
                                      )}
                                      disabled={isGenerating}
                                      onClick={async () => {
                                        setIsGenerating(true);
                                        try {
                                          const response = await fetch('/api/generate-message', {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({ product: searchQuery }),
                                          });
                                          
                                          if (!response.ok) {
                                            throw new Error('Failed to generate message');
                                          }
                                          
                                          const data = await response.json();
                                          const textarea = document.querySelector('textarea');
                                          if (textarea) {
                                            textarea.value = data.message;
                                            textarea.style.opacity = '0';
                                            textarea.style.transform = 'translateY(10px)';
                                            textarea.style.transition = 'all 0.3s ease-out';
                                            setTimeout(() => {
                                              textarea.style.opacity = '1';
                                              textarea.style.transform = 'translateY(0)';
                                            }, 50);
                                          }
                                        } catch (error) {
                                          console.error('Error generating message:', error);
                                        } finally {
                                          setIsGenerating(false);
                                        }
                                      }}
                                    >
                                      {isGenerating ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span>Генерация...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Wand2 className="h-4 w-4" />
                                          <span>Сгенерировать сообщение</span>
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  <textarea
                                    className="w-full p-2 border rounded text-sm min-h-[120px] transition-all duration-300"
                                    rows={4}
                                    placeholder="Введите текст сообщения или нажмите кнопку 'Сгенерировать сообщение' для автоматического создания"
                                    disabled={isGenerating}
                                  />
                                </div>
                                <Button 
                                  className="w-full" 
                                  onClick={() => {
                                    const textarea = document.querySelector('textarea');
                                    const message = encodeURIComponent(textarea?.value || '');
                                    const whatsappNumber = company.whatsapp?.replace(/\D/g, '');
                                    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
                                  }}
                                >
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Отправить запрос
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        <a href={company.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Подробнее
                        </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
