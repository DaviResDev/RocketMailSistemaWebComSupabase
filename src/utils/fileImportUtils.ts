
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ImportedContact = {
  nome: string;
  email: string;
  telefone?: string;
  cliente?: string;
  razao_social?: string;
  tags?: string[];
};

export type ImportResult = {
  success: boolean;
  data: ImportedContact[];
  errors: string[];
  totalRows: number;
  validRows: number;
};

// Mapeamento de possíveis nomes de colunas para nossos campos
const COLUMN_MAPPINGS = {
  nome: ['nome', 'name', 'Name', 'Nome', 'NOME', 'full_name', 'fullname'],
  email: ['email', 'Email', 'e-mail', 'E-mail', 'EMAIL', 'mail'],
  telefone: ['telefone', 'phone', 'Phone', 'Telefone', 'TELEFONE', 'tel', 'Tel', 'TEL', 'celular', 'mobile'],
  cliente: ['cliente', 'client', 'Client', 'Cliente', 'CLIENTE'],
  razao_social: ['razao_social', 'razão social', 'empresa', 'Empresa', 'company', 'Company', 'EMPRESA', 'business_name']
};

function normalizeColumnName(columnName: string): string | null {
  const cleanColumn = columnName.trim();
  
  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    if (variations.includes(cleanColumn)) {
      return field;
    }
  }
  
  return null;
}

function validateContact(contact: any): ImportedContact | null {
  const nome = contact.nome?.toString().trim();
  const email = contact.email?.toString().trim();
  
  if (!nome || !email) {
    return null;
  }
  
  // Validação básica de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return null;
  }
  
  return {
    nome,
    email,
    telefone: contact.telefone?.toString().trim() || '',
    cliente: contact.cliente?.toString().trim() || '',
    razao_social: contact.razao_social?.toString().trim() || '',
    tags: ['importado']
  };
}

function normalizeRowData(row: any): any {
  const normalizedRow: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key as string);
    if (normalizedKey && value !== null && value !== undefined) {
      normalizedRow[normalizedKey] = value;
    }
  }
  
  return normalizedRow;
}

export async function processCSVFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const validContacts: ImportedContact[] = [];
    let totalRows = 0;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        totalRows = results.data.length;
        
        if (results.errors.length > 0) {
          errors.push(...results.errors.map(err => `Linha ${err.row}: ${err.message}`));
        }
        
        results.data.forEach((row: any, index: number) => {
          try {
            const normalizedRow = normalizeRowData(row);
            const contact = validateContact(normalizedRow);
            
            if (contact) {
              validContacts.push(contact);
            } else {
              errors.push(`Linha ${index + 1}: Dados inválidos (nome ou email ausente/inválido)`);
            }
          } catch (error) {
            errors.push(`Linha ${index + 1}: Erro ao processar dados`);
          }
        });
        
        resolve({
          success: validContacts.length > 0,
          data: validContacts,
          errors,
          totalRows,
          validRows: validContacts.length
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`Erro ao processar CSV: ${error.message}`],
          totalRows: 0,
          validRows: 0
        });
      }
    });
  });
}

export async function processExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const errors: string[] = [];
    const validContacts: ImportedContact[] = [];
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Usar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({
            success: false,
            data: [],
            errors: ['Arquivo Excel não contém planilhas'],
            totalRows: 0,
            validRows: 0
          });
          return;
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: ['Planilha está vazia'],
            totalRows: 0,
            validRows: 0
          });
          return;
        }
        
        // Primeira linha como cabeçalho
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        dataRows.forEach((row: any[], index: number) => {
          try {
            // Criar objeto com base nos cabeçalhos
            const rowObj: any = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined && row[colIndex] !== null) {
                rowObj[header] = row[colIndex];
              }
            });
            
            const normalizedRow = normalizeRowData(rowObj);
            const contact = validateContact(normalizedRow);
            
            if (contact) {
              validContacts.push(contact);
            } else {
              errors.push(`Linha ${index + 2}: Dados inválidos (nome ou email ausente/inválido)`);
            }
          } catch (error) {
            errors.push(`Linha ${index + 2}: Erro ao processar dados`);
          }
        });
        
        resolve({
          success: validContacts.length > 0,
          data: validContacts,
          errors,
          totalRows: dataRows.length,
          validRows: validContacts.length
        });
        
      } catch (error: any) {
        resolve({
          success: false,
          data: [],
          errors: [`Erro ao processar arquivo Excel: ${error.message}`],
          totalRows: 0,
          validRows: 0
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['Erro ao ler arquivo'],
        totalRows: 0,
        validRows: 0
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function getFileType(file: File): 'csv' | 'excel' | 'unknown' {
  const extension = file.name.toLowerCase().split('.').pop();
  
  if (extension === 'csv') {
    return 'csv';
  } else if (['xlsx', 'xls'].includes(extension || '')) {
    return 'excel';
  }
  
  return 'unknown';
}

export async function processImportFile(file: File): Promise<ImportResult> {
  const fileType = getFileType(file);
  
  switch (fileType) {
    case 'csv':
      return await processCSVFile(file);
    case 'excel':
      return await processExcelFile(file);
    default:
      return {
        success: false,
        data: [],
        errors: [`Tipo de arquivo não suportado: ${file.name}. Use arquivos CSV (.csv) ou Excel (.xlsx, .xls)`],
        totalRows: 0,
        validRows: 0
      };
  }
}
