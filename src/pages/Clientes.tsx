import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Edit, Trash2, Mail, Phone, MapPin, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Cliente } from '@/store/types';
import { validarCpfCnpj, maskCPF, maskCNPJ, maskCEP, maskPhone, UFS } from '@/lib/validations';

// Schema de validação
const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  doc: z.string().optional().refine(
    (val) => !val || validarCpfCnpj(val),
    'CPF ou CNPJ inválido'
  ),
  responsavel: z.string().trim().min(1, 'Responsável é obrigatório').max(200),
  whats: z.string().trim().max(20).optional(),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  cep: z.string().trim().max(10).optional(),
  enderecoRua: z.string().trim().max(255).optional(),
  enderecoNumero: z.string().trim().max(20).optional(),
  enderecoComp: z.string().trim().max(100).optional(),
  enderecoBairro: z.string().trim().max(100).optional(),
  enderecoCidade: z.string().trim().max(100).optional(),
  enderecoUF: z.string().trim().length(2).optional().or(z.literal('')),
  obs: z.string().trim().max(2000).optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

// Interface para resposta da ViaCEP
interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}


export default function Clientes() {
  const { clientes, createCliente, updateCliente, deleteCliente, responsaveis, loading } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [filtroResp, setFiltroResp] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
  });

  const cepValue = watch('cep');

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      reset({
        nome: cliente.nome || '',
        doc: cliente.doc || '',
        responsavel: cliente.responsavel || '',
        whats: cliente.whats || '',
        email: cliente.email || '',
        cep: cliente.cep || '',
        enderecoRua: cliente.enderecoRua || '',
        enderecoNumero: cliente.enderecoNumero || '',
        enderecoComp: cliente.enderecoComp || '',
        enderecoBairro: cliente.enderecoBairro || '',
        enderecoCidade: cliente.enderecoCidade || '',
        enderecoUF: cliente.enderecoUF || '',
        obs: cliente.obs || '',
      });
    } else {
      setEditingCliente(null);
      reset({
        nome: '',
        doc: '',
        responsavel: '',
        whats: '',
        email: '',
        cep: '',
        enderecoRua: '',
        enderecoNumero: '',
        enderecoComp: '',
        enderecoBairro: '',
        enderecoCidade: '',
        enderecoUF: '',
        obs: '',
      });
    }
    setDialogOpen(true);
  };

  const buscarCEP = async () => {
    const cep = cepValue?.replace(/\D/g, '');
    
    if (!cep || cep.length !== 8) {
      toast.error('Digite um CEP válido com 8 dígitos');
      return;
    }

    setLoadingCEP(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data: ViaCEPResponse = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setValue('enderecoRua', data.logradouro);
      setValue('enderecoBairro', data.bairro);
      setValue('enderecoCidade', data.localidade);
      setValue('enderecoUF', data.uf);
      toast.success('Endereço preenchido pelo CEP');
    } catch (error) {
      toast.error('Falha ao buscar CEP');
      console.error(error);
    } finally {
      setLoadingCEP(false);
    }
  };


  const onSubmit = async (data: ClienteFormData) => {
    setSubmitting(true);
    const clienteData: Partial<Cliente> = {
      nome: data.nome,
      doc: data.doc?.replace(/\D/g, '') || undefined,
      responsavel: data.responsavel,
      whats: data.whats?.replace(/\D/g, '') || undefined,
      email: data.email || undefined,
      cep: data.cep?.replace(/\D/g, '') || undefined,
      enderecoRua: data.enderecoRua || undefined,
      enderecoNumero: data.enderecoNumero || undefined,
      enderecoComp: data.enderecoComp || undefined,
      enderecoBairro: data.enderecoBairro || undefined,
      enderecoCidade: data.enderecoCidade || undefined,
      enderecoUF: data.enderecoUF || undefined,
      obs: data.obs || undefined,
    };

    if (editingCliente) {
      updateCliente(editingCliente.id, clienteData);
      toast.success('Cliente atualizado!');
    } else {
      createCliente(clienteData as Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>);
      toast.success('Cliente criado!');
    }

    setDialogOpen(false);
    reset();
    setSubmitting(false);
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Confirma exclusão do cliente "${nome}"?`)) {
      deleteCliente(id);
      toast.success('Cliente excluído!');
    }
  };

  const formatarEndereco = (cliente: Cliente): string => {
    const partes = [];
    
    if (cliente.enderecoRua) partes.push(cliente.enderecoRua);
    if (cliente.enderecoNumero) partes.push(cliente.enderecoNumero);
    if (cliente.enderecoComp) partes.push(cliente.enderecoComp);
    if (cliente.enderecoBairro) partes.push(cliente.enderecoBairro);
    if (cliente.enderecoCidade && cliente.enderecoUF) {
      partes.push(`${cliente.enderecoCidade}/${cliente.enderecoUF}`);
    } else if (cliente.enderecoCidade) {
      partes.push(cliente.enderecoCidade);
    }
    if (cliente.cep) partes.push(`CEP: ${maskCEP(cliente.cep)}`);
    
    return partes.join(', ') || cliente.endereco || '';
  };

  const formatarDoc = (doc?: string): string => {
    if (!doc) return '';
    const docLimpo = doc.replace(/\D/g, '');
    if (docLimpo.length === 11) return maskCPF(docLimpo);
    if (docLimpo.length === 14) return maskCNPJ(docLimpo);
    return doc;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua base de clientes</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Filtro por Responsável */}
      <div className="flex gap-2 items-center">
        <Label className="whitespace-nowrap">Filtrar por responsável:</Label>
        <div className="relative w-64">
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            list="lista-responsaveis"
            placeholder="Todos"
            value={filtroResp}
            onChange={(e) => setFiltroResp(e.target.value)}
          />
          <datalist id="lista-responsaveis">
            {responsaveis.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        {filtroResp && (
          <Button variant="outline" onClick={() => setFiltroResp('')}>Limpar</Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))
        ) : clientes
          .filter((c) => !filtroResp || (c.responsavel || '').toLowerCase().includes(filtroResp.toLowerCase()))
          .map((cliente) => (
          <Card key={cliente.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                  {cliente.doc && (
                    <CardDescription className="mt-1">{formatarDoc(cliente.doc)}</CardDescription>
                  )}
                  {cliente.responsavel && (
                    <CardDescription className="mt-1 text-xs">
                      Resp: {cliente.responsavel}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(cliente)}
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(cliente.id, cliente.nome)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {cliente.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{cliente.email}</span>
                </div>
              )}
              {cliente.whats && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{maskPhone(cliente.whats)}</span>
                </div>
              )}
              {formatarEndereco(cliente) && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-3">{formatarEndereco(cliente)}</span>
                </div>
              )}
              {cliente.obs && (
                <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/50 rounded-md line-clamp-2">
                  {cliente.obs}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {clientes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">Nenhum cliente cadastrado</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Cliente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente. Campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Nome / Razão Social */}
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome / Razão Social *</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Nome completo ou razão social"
                className={errors.nome ? 'border-destructive' : ''}
              />
              {errors.nome && (
                <p className="text-sm text-destructive">{errors.nome.message}</p>
              )}
            </div>

            {/* CPF / CNPJ */}
            <div className="grid gap-2">
              <Label htmlFor="doc">CPF / CNPJ</Label>
              <Input
                id="doc"
                {...register('doc')}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                className={errors.doc ? 'border-destructive' : ''}
                onChange={(e) => {
                  const valor = e.target.value.replace(/\D/g, '');
                  const formatado = valor.length <= 11 ? maskCPF(valor) : maskCNPJ(valor);
                  setValue('doc', formatado);
                }}
              />
              {errors.doc && (
                <p className="text-sm text-destructive">{errors.doc.message}</p>
              )}
            </div>

            {/* Responsável (obrigatório) com autocomplete */}
            <div className="grid gap-2">
              <Label htmlFor="responsavel">Responsável *</Label>
              <input
                id="responsavel"
                list="suggest-resp"
                placeholder="Nome do responsável"
                className={`border rounded-md px-3 py-2 ${errors.responsavel ? 'border-destructive' : ''}`}
                {...register('responsavel')}
              />
              <datalist id="suggest-resp">
                {responsaveis.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              {errors.responsavel && (
                <p className="text-sm text-destructive">{errors.responsavel.message}</p>
              )}
            </div>

            {/* WhatsApp e E-mail */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="whats">WhatsApp</Label>
                <Input
                  id="whats"
                  {...register('whats')}
                  placeholder="(00) 00000-0000"
                  onChange={(e) => {
                    const formatado = maskPhone(e.target.value);
                    setValue('whats', formatado);
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contato@exemplo.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* CEP + Buscar */}
            <div className="grid gap-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  {...register('cep')}
                  placeholder="00000-000"
                  onChange={(e) => {
                    const formatado = maskCEP(e.target.value);
                    setValue('cep', formatado);
                  }}
                  onBlur={() => {
                    const cep = cepValue?.replace(/\D/g, '');
                    if (cep && cep.length === 8) {
                      buscarCEP();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={buscarCEP}
                  disabled={loadingCEP}
                  className="whitespace-nowrap"
                >
                  {loadingCEP ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2">Buscar CEP</span>
                </Button>
              </div>
            </div>

            {/* Rua e Número */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="enderecoRua">Rua / Logradouro</Label>
                <Input
                  id="enderecoRua"
                  {...register('enderecoRua')}
                  placeholder="Nome da rua"
                  disabled={loadingCEP}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="enderecoNumero">Número</Label>
                <Input
                  id="enderecoNumero"
                  {...register('enderecoNumero')}
                  placeholder="123"
                />
              </div>
            </div>

            {/* Complemento */}
            <div className="grid gap-2">
              <Label htmlFor="enderecoComp">Complemento</Label>
              <Input
                id="enderecoComp"
                {...register('enderecoComp')}
                placeholder="Apto, bloco, sala..."
              />
            </div>

            {/* Bairro, Cidade e UF */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="enderecoBairro">Bairro</Label>
                <Input
                  id="enderecoBairro"
                  {...register('enderecoBairro')}
                  placeholder="Bairro"
                  disabled={loadingCEP}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="enderecoCidade">Cidade</Label>
                <Input
                  id="enderecoCidade"
                  {...register('enderecoCidade')}
                  placeholder="Cidade"
                  disabled={loadingCEP}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="enderecoUF">UF</Label>
                <Select
                  value={watch('enderecoUF')}
                  onValueChange={(value) => setValue('enderecoUF', value)}
                  disabled={loadingCEP}
                >
                  <SelectTrigger id="enderecoUF">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="grid gap-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                {...register('obs')}
                placeholder="Informações adicionais sobre o cliente"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingCliente ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

