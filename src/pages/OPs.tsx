import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, FileText, Download, Archive, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

export default function OPs() {
  const navigate = useNavigate();
  const { ops = [], deleteOP, updateOP, loading } = (useStore() as any) || {};

  const handleDelete = (opId: string) => {
    if (confirm(`Confirma exclusão da OP "${opId}"?`)) {
      deleteOP(opId);
      toast.success('OP excluída!');
    }
  };

  const handleArchive = (op: any) => {
    if (op.publicada && op.stages.every((s: any) => (s.status || 'A Fazer') === 'Finalizado')) {
      updateOP(op.id, { arquivada: true });
      toast.success('OP arquivada');
    } else {
      toast.error('Só é possível arquivar OP finalizada');
    }
  };

  const handleExportOP = (op: any) => {
    try {
      const json = JSON.stringify(op, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      saveAs(blob, `${op.id}-export.json`);
      toast.success('OP exportada!');
    } catch (error) {
      toast.error('Erro ao exportar OP');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ordens de Produção</h1>
          <p className="text-muted-foreground mt-1">Gerencie as OPs do sistema</p>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-4 w-64 mt-1" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          (ops || []).map((op: any) => (
            <Card key={op.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl">{op.id}</CardTitle>
                    <Badge variant={op.publicada ? 'default' : 'secondary'}>
                      {op.publicada ? 'Publicada' : 'Rascunho'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Pedido: {op.orderId} • Cliente: {op.clientName}
                  </CardDescription>
                  <CardDescription className="mt-1">
                    SLA: {format(new Date(op.slaISO), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/ops/${op.id}/planner`)}
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Planner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportOP(op)}
                    className="hover:bg-info/10 hover:text-info"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchive(op)}
                    className="hover:bg-muted/60"
                    title="Arquivar OP"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(op.id)}
                    title="Excluir OP"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{(op.stages?.length ?? 0)} etapas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )))}
      </div>

      {(ops || []).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">Nenhuma OP cadastrada</p>
            <p className="text-sm text-muted-foreground">
              Crie OPs a partir dos pedidos na página de Pedidos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
