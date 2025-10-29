import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function KanbanArchived() {
  const { pedidos, ops, restoreOrder } = useStore() as any;
  const [filter, setFilter] = useState('');

  const archived = useMemo(() => pedidos.filter((p: any) => p.archived), [pedidos]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pedidos Arquivados</h1>
      </div>
      <div className="grid gap-4">
        {archived.length === 0 && <p className="text-muted-foreground">Nenhum pedido arquivado.</p>}
        {archived.map((order: any) => {
          const orderOps = ops.filter((o: any) => o.orderId === order.id);
          return (
            <Card key={order.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>{order.id}</span>
                  <span>•</span>
                  <span className="text-base font-normal">{order.clientName}</span>
                  <Badge variant="outline" className="ml-auto">Arquivado em {new Date(order.archivedAt).toLocaleString('pt-BR')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  SLA do Pedido: {new Date(order.slaISO).toLocaleString('pt-BR')}
                </div>
                <div className="flex gap-2">
                  <Button variant="default" onClick={() => restoreOrder(order.id)}>Restaurar</Button>
                  <Button variant="outline" onClick={() => (window.location.href = `/relatorios/pedido/${order.id}`)}>Relatório</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

