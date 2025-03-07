'use client';

import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'; // Importar componentes de dropdown
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { useUpdateContext } from '@/context/GlobalUpdateContext.tsx';
import { useUser } from '@/context/UserContext';
import useFetchDocuments from '@/hooks/useFetchDocuments';
import { useFirestore } from '@/hooks/useFirestore';
import { createLogin } from '@/lib/createLogin';
import { cn } from '@/lib/utils';
import { MoreVertical, Plus, Upload } from 'lucide-react'; // Adicionar MoreVertical
import Link from 'next/link';
import Papa from 'papaparse';
import { ChangeEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import EmployeeTable from './employee-tables';

export default function EmployeeListingPage() {
  const { user } = useUser();

  const {
    documents: employees,
    fetchDocuments,
    loading: employeesLoading,
    error: employeesError
  } = useFetchDocuments('funcionarios');

  const {
    documents: accrediting,
    loading: accreditingLoading,
    error: accreditingError
  } = useFetchDocuments('credenciadoras');

  const {
    documents: companies,
    loading: companiesLoading,
    error: companiesError
  } = useFetchDocuments('empresas');

  const { addDocument } = useFirestore({
    collectionName: 'funcionarios',
    onSuccess: () => {
      toast.success('Funcionários importados com sucesso!');
      fetchDocuments();
    },
    onError: (err) => {
      console.error(err);
      toast.error('Erro ao importar funcionários.');
    }
  });

  const { addDocument: addUser } = useFirestore({
    collectionName: 'users'
  });

  const [mergedEmployees, setMergedEmployees] = useState<any[]>([]);

  const { updateFlag } = useUpdateContext();

  useEffect(() => {
    const fetchDoc = async () => {
      console.log('Buscando dados...');
      await fetchDocuments();
    };
    fetchDoc();
  }, [updateFlag]);

  useEffect(() => {
    if (user && employees && companies) {
      let filteredEmployees = employees;

      if (user.role === 'business') {
        filteredEmployees = employees.filter(
          (employee) => employee.empresaId === user.uid
        );
      } else if (user.role === 'accrediting') {
        const accreditingCompanies = companies.filter(
          (company) => company.accrediting_Id === user.uid
        );
        const accreditingCompanyIds = accreditingCompanies.map(
          (company) => company.id
        );
        filteredEmployees = employees.filter((employee) =>
          accreditingCompanyIds.includes(employee.empresaId)
        );
      }

      const merged = filteredEmployees.map((employee) => {
        const companyName =
          companies.find((company) => company.id === employee.empresaId)
            ?.razaoSocial || 'Empresa desconhecida';
        return {
          ...employee,
          companyName,
          id: String(employee.id)
        };
      });

      setMergedEmployees(merged);
    }
  }, [employees, companies, user]);

  const totalEmployees = mergedEmployees?.length || 0;

  // Função para processar o upload do CSV
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const csvData = result.data as any[];

        for (const row of csvData) {
          try {
            const employeeData = {
              nome: row['nome'] || '',
              dataNascimento: row['dataNascimento'] || '',
              endereco: row['endereco'] || '',
              cpf: row['cpf'] || '',
              email: row['email'] || '',
              telefone: row['telefone'] || '',
              pessoasNaCasa: row['pessoasNaCasa'] || '',
              empresaId:
                user?.role === 'business'
                  ? user.uid
                  : companies.find(
                      (company) => company.nomeFantasia === row['empresa']
                    )?.id || ''
            };

            const userUid = await createLogin(employeeData.email);
            const userInfo = {
              uid: userUid,
              role: 'employee',
              name: employeeData.nome,
              email: employeeData.email
            };

            await addUser(userInfo, null);
            await addDocument(employeeData, userUid);
          } catch (error) {
            console.error('Erro ao processar linha do CSV:', error);
            toast.error(`Erro ao importar funcionário: ${row['nome']}`);
          }
        }
      },
      error: (error) => {
        console.error('Erro ao parsear CSV:', error);
        toast.error('Erro ao processar o arquivo CSV.');
      }
    });

    event.target.value = '';
  };

  // Função para baixar o template CSV
  const downloadTemplate = () => {
    const templateHeaders = [
      'nome',
      'dataNascimento',
      'endereco',
      'cpf',
      'email',
      'telefone',
      'pessoasNaCasa',
      'empresa'
    ];
    const csvContent = `${templateHeaders.join(',')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_funcionarios.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <Heading
            title={`Funcionários (${totalEmployees})`}
            description="Gerenciar Funcionários."
          />
          <div className="flex gap-2">
            <Link
              href={'/dashboard/funcionarios/novo'}
              className={cn(buttonVariants({ variant: 'default' }))}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Novo Funcionário
            </Link>
            <label
              className={cn(
                buttonVariants({ variant: 'default' }),
                'cursor-pointer'
              )}
            >
              <Upload className="mr-2 h-4 w-4" /> Importar Funcionários
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'default', size: 'icon' })
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={downloadTemplate}>
                  Baixar Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Separator />

        {(employeesLoading || companiesLoading) && (
          <p>Carregando os dados...</p>
        )}
        {(employeesError || companiesError) && <p>Erro ao carregar os dados</p>}

        {!employeesLoading &&
          !companiesLoading &&
          !employeesError &&
          !companiesError && (
            <EmployeeTable data={mergedEmployees} totalData={totalEmployees} />
          )}
      </div>
    </PageContainer>
  );
}
