'use client';
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Employee } from '@/constants/data';
import { useUpdateContext } from '@/context/GlobalUpdateContext.tsx';
import useDeleteDocument from '@/hooks/useDeleteDocument';
import { Edit, MoreHorizontal, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface CellActionProps {
  data: Employee;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { triggerUpdate } = useUpdateContext();

  const { deleteDocument } = useDeleteDocument('empresas'); // Hook é chamado fora do evento

  const onConfirm = async () => {
    setLoading(true);
    try {
      const success = await deleteDocument(data.id); // Função retornada do hook
      if (success) {
        toast.success('Empresa deletado com Sucesso!');
        setOpen(false);
        triggerUpdate();
      } else {
        toast.error('Erro ao deletar o Empresa.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro inesperado ao deletar o Empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/empresas/${data.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Alterar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-500 hover:text-red-500"
            onClick={() => setOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" /> Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
