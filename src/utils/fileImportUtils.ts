
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
  razao_social: [
    'razao_social', 'razão social', 'razao social', 'Razão Social', 'Razao Social', 
    'RAZÃO SOCIAL', 'RAZAO SOCIAL', 'empresa', 'Empresa', 'EMPRESA', 
    'company', 'Company', 'COMPANY', 'business_name', 'Business Name',
    'companyname', 'CompanyName', 'company_name', 'Company_Name'
  ]
};

function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, ' ') // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

function normalizeColumnName(columnName: string): string | null {
  const cleanColumn = columnName.trim();
  const normalizedInput = normalizeString(cleanColumn);
  
  console.log(`🔍 Tentando mapear coluna: "${columnName}" -> normalizada: "${normalizedInput}"`);
  
  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    // Check exact matches first
    if (variations.includes(cleanColumn)) {
      console.log(`✅ Mapeamento exato encontrado: "${cleanColumn}" -> ${field}`);
      return field;
    }
    
    // Check normalized matches
    for (const variation of variations) {
      const normalizedVariation = normalizeString(variation);
      if (normalizedInput === normalizedVariation) {
        console.log(`✅ Mapeamento normalizado encontrado: "${cleanColumn}" -> ${field} (via "${variation}")`);
        return field;
      }
    }
  }
  
  console.log(`❌ Nenhum mapeamento encontrado para: "${columnName}"`);
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
  
  const validatedContact = {
    nome,
    email,
    telefone: contact.telefone?.toString().trim() || '',
    cliente: contact.cliente?.toString().trim() || '',
    razao_social: contact.razao_social?.toString().trim() || '',
    tags: ['importado']
  };
  
  console.log(`✅ Contato validado:`, {
    nome: validatedContact.nome,
    email: validatedContact.email,
    razao_social: validatedContact.razao_social || '(vazio)',
    cliente: validatedContact.cliente || '(vazio)'
  });
  
  return validatedContact;
}

function normalizeRowData(row: any): any {
  const normalizedRow: any = {};
  
  console.log(`📋 Processando linha com colunas:`, Object.keys(row));
  
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key as string);
    if (normalizedKey && value !== null && value !== undefined && value !== '') {
      normalizedRow[normalizedKey] = value;
      console.log(`✅ Coluna mapeada: "${key}" -> "${normalizedKey}" = "${value}"`);
    } else if (value === null || value === undefined || value === '') {
      console.log(`⚠️ Valor vazio para coluna "${key}"`);
    }
  }
  
  console.log(`📋 Dados normalizados:`, normalizedRow);
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
        
        console.log(`📊 Cabeçalhos encontrados no Excel:`, headers);
        
        dataRows.forEach((row: any[], index: number) => {
          try {
            // Criar objeto com base nos cabeçalhos
            const rowObj: any = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined && row[colIndex] !== null) {
                rowObj[header] = row[colIndex];
              }
            });
            
            console.log(`📝 Linha ${index + 2} dados brutos:`, rowObj);
            
            const normalizedRow = normalizeRowData(rowObj);
            const contact = validateContact(normalizedRow);
            
            if (contact) {
              validContacts.push(contact);
            } else {
              errors.push(`Linha ${index + 2}: Dados inválidos (nome ou email ausente/inválido)`);
            }
          } catch (error) {
            console.error(`Erro ao processar linha ${index + 2}:`, error);
            errors.push(`Linha ${index + 2}: Erro ao processar dados`);
          }
        });
        
        console.log(`📊 Resumo da importação - Total: ${dataRows.length}, Válidos: ${validContacts.length}, Erros: ${errors.length}`);
        
        resolve({
          success: validContacts.length > 0,
          data: validContacts,
          errors,
          totalRows: dataRows.length,
          validRows: validContacts.length
        });
        
      } catch (error: any) {
        console.error('Erro ao processar arquivo Excel:', error);
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
