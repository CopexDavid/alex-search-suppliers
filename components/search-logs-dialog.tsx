'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchLog {
  id: string;
  timestamp: string;
  positionId: string;
  positionName: string;
  searchQueries: string[];
  resultsFound: number;
  suppliersFound: number;
  status: 'success' | 'error' | 'running';
  duration?: number;
  errorMessage?: string;
  details?: {
    googleResults: number;
    yandexResults: number;
    filteredResults: number;
    contactsParsed: number;
  };
}

interface SearchLogsDialogProps {
  requestId: string;
}

export function SearchLogsDialog({ requestId }: SearchLogsDialogProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/requests/${requestId}/search-logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else if (response.status === 401) {
        // Пользователь не авторизован
        alert('Для просмотра логов поиска необходимо войти в систему');
        window.location.href = '/login';
        return;
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Ошибка загрузки логов поиска');
        console.error('Failed to load search logs:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error loading search logs:', error);
      alert('Ошибка соединения при загрузке логов поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadLogs();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Успешно</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Выполняется</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}мс`;
    return `${(duration / 1000).toFixed(1)}с`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Логи поиска
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Логи поиска поставщиков
          </DialogTitle>
          <DialogDescription>
            Детальная информация о процессах поиска поставщиков для всех позиций заявки
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            Всего записей: {logs.length}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Обновить
          </Button>
        </div>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Загрузка логов...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Логи поиска не найдены</p>
              <p className="text-sm">
                Логи появятся после выполнения поиска поставщиков
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center">
                        {getStatusIcon(log.status)}
                        <span className="ml-2">{log.positionName}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(log.status)}
                        <Badge variant="outline" className="text-xs">
                          {formatTimestamp(log.timestamp)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {log.resultsFound}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Результатов найдено
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {log.suppliersFound}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Поставщиков найдено
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {log.searchQueries.length}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Поисковых запросов
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatDuration(log.duration)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Время выполнения
                        </div>
                      </div>
                    </div>

                    {log.details && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <Badge variant="outline" className="justify-center">
                          Google: {log.details.googleResults}
                        </Badge>
                        <Badge variant="outline" className="justify-center">
                          Yandex: {log.details.yandexResults}
                        </Badge>
                        <Badge variant="outline" className="justify-center">
                          Отфильтровано: {log.details.filteredResults}
                        </Badge>
                        <Badge variant="outline" className="justify-center">
                          Контакты: {log.details.contactsParsed}
                        </Badge>
                      </div>
                    )}

                    {log.searchQueries.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium mb-2">Поисковые запросы:</div>
                        <div className="flex flex-wrap gap-1">
                          {log.searchQueries.slice(0, 5).map((query, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {query}
                            </Badge>
                          ))}
                          {log.searchQueries.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{log.searchQueries.length - 5} еще
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {log.errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-sm font-medium text-red-800">Ошибка:</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{log.errorMessage}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
