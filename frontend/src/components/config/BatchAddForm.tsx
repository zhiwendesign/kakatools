'use client';

import { useState, useRef } from 'react';
import { CategoryType, FiltersMap } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import * as XLSX from 'xlsx';

interface BatchAddFormProps {
  filters: FiltersMap;
  onSave: (resources: Array<{
    id: string;
    title: string;
    description: string;
    category: CategoryType;
    tags: string[];
    imageUrl: string;
    link: string;
    featured: boolean;
    contentType?: 'link' | 'document' | 'image';
    content?: string;
  }>) => Promise<void>;
  onCancel: () => void;
  showHeader?: boolean;
}

interface ExcelRow {
  标题?: string;
  分类?: string;
  描述?: string;
  标签?: string;
  图片链接?: string;
  跳转链接?: string;
  卡卡推荐?: string | boolean;
  内容类型?: string;
  文档内容?: string;
}

export function BatchAddForm({ filters, onSave, onCancel, showHeader = true }: BatchAddFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validCategories: CategoryType[] = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // 检查文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('请选择 Excel 文件 (.xlsx, .xls) 或 CSV 文件');
      return;
    }

    setFile(selectedFile);
    setParsedData([]);
    setPreviewData([]);
    setErrors([]);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 读取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 转换为 JSON
      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: '', // 空单元格默认为空字符串
      });

      if (jsonData.length === 0) {
        setErrors(['Excel 文件中没有数据']);
        setIsProcessing(false);
        return;
      }

      // 验证和转换数据
      const validatedData: any[] = [];
      const validationErrors: string[] = [];

      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // Excel 行号（从第2行开始，第1行是标题）
        const rowErrors: string[] = [];

        // 验证必需字段
        if (!row.标题 || !row.标题.toString().trim()) {
          rowErrors.push(`第 ${rowNum} 行：缺少"标题"字段`);
        }

        if (!row.分类 || !row.分类.toString().trim()) {
          rowErrors.push(`第 ${rowNum} 行：缺少"分类"字段`);
        } else {
          const category = row.分类.toString().trim();
          if (!validCategories.includes(category as CategoryType)) {
            rowErrors.push(`第 ${rowNum} 行：分类"${category}"无效，必须是 ${validCategories.join('、')} 之一`);
          }
        }

        if (rowErrors.length > 0) {
          validationErrors.push(...rowErrors);
          return; // 跳过无效行
        }

        // 解析标签
        let tags: string[] = [];
        if (row.标签) {
          const tagStr = row.标签.toString().trim();
          if (tagStr) {
            tags = tagStr.split(/[,，;；]/).map(t => t.trim()).filter(t => t);
          }
        }

        // 解析卡卡推荐
        let featured = false;
        if (row.卡卡推荐) {
          const featuredStr = row.卡卡推荐.toString().toLowerCase().trim();
          featured = featuredStr === 'true' || featuredStr === '是' || featuredStr === '1' || featuredStr === 'yes';
        }

        // 解析内容类型
        const contentTypeStr = row.内容类型?.toString().toLowerCase().trim();
        let contentType: 'link' | 'document' | 'image' = 'link';
        if (contentTypeStr === 'document') {
          contentType = 'document';
        } else if (contentTypeStr === 'image') {
          contentType = 'image';
        }

        // 构建资源对象
        // 生成唯一ID：分类-时间戳-随机数-索引
        const uniqueId = `${(row.分类 as string).toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
        const resource = {
          id: uniqueId,
          title: (row.标题?.toString() || '').trim(),
          description: row.描述?.toString().trim() || '',
          category: (row.分类?.toString() || '').trim() as CategoryType,
          tags: tags,
          imageUrl: row.图片链接?.toString().trim() || '',
          link: row.跳转链接?.toString().trim() || '',
          featured: featured,
          contentType: contentType,
          content: contentType === 'document' || contentType === 'image' 
            ? (row.文档内容?.toString().trim() || row.图片链接?.toString().trim() || '')
            : '',
        };

        validatedData.push(resource);
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
      }

      setParsedData(validatedData);
      setPreviewData(validatedData.slice(0, 5)); // 预览前5条

      if (validatedData.length === 0) {
        setErrors(['没有有效的数据行，请检查 Excel 文件格式']);
      }
    } catch (error) {
      console.error('解析 Excel 文件失败:', error);
      setErrors(['解析 Excel 文件失败，请确保文件格式正确']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (parsedData.length === 0) {
      alert('没有可保存的数据');
      return;
    }

    if (errors.length > 0) {
      const confirm = window.confirm(`检测到 ${errors.length} 个错误，是否仍要继续保存？`);
      if (!confirm) return;
    }

    setIsSaving(true);
    try {
      await onSave(parsedData);
      // 清空表单
      setFile(null);
      setParsedData([]);
      setPreviewData([]);
      setErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // 保存成功后，调用 onCancel 切换回单个新增模式
      onCancel();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setParsedData([]);
    setPreviewData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    // 创建示例数据
    const templateData = [
      {
        标题: '示例资源1',
        分类: 'AIGC',
        描述: '这是一个示例资源的描述',
        标签: 'AI工具,免费',
        图片链接: 'https://example.com/image.jpg',
        跳转链接: 'https://example.com',
        卡卡推荐: '是',
        内容类型: 'link',
        文档内容: '',
      },
      {
        标题: '示例资源2',
        分类: 'UXTips',
        描述: '另一个示例资源',
        标签: '设计工具',
        图片链接: '',
        跳转链接: 'https://example.com/tool',
        卡卡推荐: '否',
        内容类型: 'link',
        文档内容: '',
      },
    ];

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '资源列表');

    // 下载文件
    XLSX.writeFile(workbook, '批量新增资源模板.xlsx');
  };

  return (
    <div className={showHeader ? 'p-8 animate-fade-in' : 'animate-fade-in'}>
      {showHeader && (
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
              批量新增
            </span>
            <h2 className="text-xl font-bold text-primary mt-2">批量导入资源</h2>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onCancel}>
              取消
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || parsedData.length === 0 || isProcessing}
            >
              {isSaving ? '保存中...' : (
                <>
                  <Icon name="save" size={16} /> 批量保存 ({parsedData.length} 条)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      {!showHeader && (
        <div className="flex items-center justify-end mb-6">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || parsedData.length === 0 || isProcessing}
          >
            {isSaving ? '保存中...' : (
              <>
                <Icon name="save" size={16} /> 批量保存 ({parsedData.length} 条)
              </>
            )}
          </Button>
        </div>
      )}

      <div className="space-y-6 max-w-4xl">
        {/* 文件上传区域 */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="upload" size={16} className="text-secondary" /> 上传 Excel 文件
          </label>

          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-surface-highlight/30 hover:bg-surface-highlight/50 transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Icon name="upload" size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">点击上传 Excel 文件</p>
                <p className="text-xs text-secondary mt-1">支持 .xlsx、.xls、.csv 格式</p>
              </div>
            </label>

            {file && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon name="fileText" size={20} className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">{file.name}</p>
                    <p className="text-xs text-secondary">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Excel 模板说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Icon name="info" size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-blue-800">Excel 文件格式要求：</p>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1"
                >
                  <Icon name="download" size={12} />
                  下载模板
                </button>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-blue-800">
                <li><strong>必需列：</strong>标题、分类</li>
                <li><strong>可选列：</strong>描述、标签（用逗号分隔）、图片链接、跳转链接、卡卡推荐（true/是/1）、内容类型（link/document/image）、文档内容或图片链接</li>
                <li><strong>分类值：</strong>必须是 AIGC、UXTips、Learning、星芒学社、图库 之一</li>
                <li><strong>标签：</strong>多个标签用逗号或分号分隔</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 处理中状态 */}
        {isProcessing && (
          <div className="flex items-center justify-center py-8 text-secondary">
            <Icon name="loader" size={24} className="animate-spin mr-2" />
            <span>正在解析 Excel 文件...</span>
          </div>
        )}

        {/* 错误提示 */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <Icon name="alertCircle" size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800">发现 {errors.length} 个错误：</p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 数据预览 */}
        {previewData.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary">
                数据预览（共 {parsedData.length} 条，显示前 {previewData.length} 条）
              </label>
              <span className="text-xs text-secondary">
                {errors.length > 0 ? '部分数据有错误，请检查' : '数据格式正确'}
              </span>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-highlight">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary">标题</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary">分类</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary">标签</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-secondary">卡卡推荐</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewData.map((item, index) => (
                      <tr key={index} className="hover:bg-surface-highlight/50">
                        <td className="px-4 py-2 text-primary">{item.title}</td>
                        <td className="px-4 py-2 text-secondary">{item.category}</td>
                        <td className="px-4 py-2 text-secondary">
                          {item.tags.length > 0 ? item.tags.join(', ') : '-'}
                        </td>
                        <td className="px-4 py-2">
                          {item.featured ? (
                            <span className="text-amber-600">是</span>
                          ) : (
                            <span className="text-secondary">否</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BatchAddForm;

