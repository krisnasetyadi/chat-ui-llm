"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Upload,
  FileText,
  Database,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Eye,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PdfCollectionsApi,
  PdfUploadApi,
  PdfCollectionApi,
  ChatCollectionsApi,
  ChatUploadApi,
  ChatCollectionApi,
} from "@/services";
import type {
  PdfCollection,
  UploadResponse,
  ChatCollection,
  ChatUploadResponse,
  DeleteResponse,
} from "@/services";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  apiUrl: string;
  onApiUrlChange: (url: string) => void;
  onPreviewPdf?: (collectionId: string, fileName: string) => void;
}

// Helper function to get display title from file names
const getCollectionTitle = (collection: PdfCollection): string => {
  if (collection.file_names && collection.file_names.length > 0) {
    // Get first file name and remove extension
    const firstName = collection.file_names[0];
    return firstName
      .replace(/\.pdf$/i, "")
      .replace(/_/g, " ")
      .replace(/-/g, " ");
  }
  return "Untitled Collection";
};

export function Sidebar({
  isOpen,
  onClose,
  apiUrl,
  onApiUrlChange,
  onPreviewPdf,
}: SidebarProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("pdf");
  const [pdfCollections, setPdfCollections] = useState<PdfCollection[]>([]);
  const [chatCollections, setChatCollections] = useState<ChatCollection[]>([]);
  const [dbTables, setDbTables] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const fetchCollections = () => {
    setLoadingPdf(true);
    PdfCollectionsApi.get<PdfCollection[]>()
      .then((data) => {
        console.log("Fetched PDF collections:", data);
        setPdfCollections(data);
      })
      .catch((error) => {
        console.error("Failed to fetch collections:", error);
        toast({
          title: "Error",
          description: "Failed to fetch PDF collections",
          variant: "destructive",
        });
      })
      .finally(() => {
        setLoadingPdf(false);
      });
  };

  const fetchChatCollections = () => {
    setLoadingChat(true);
    ChatCollectionsApi.get<
      { collections: ChatCollection[]; count: number } | ChatCollection[]
    >()
      .then((data) => {
        // Handle both response formats: { collections: [...] } or [...]
        if (Array.isArray(data)) {
          setChatCollections(data);
        } else if (data && Array.isArray(data.collections)) {
          setChatCollections(data.collections);
        } else {
          setChatCollections([]);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch chat collections:", error);
        setChatCollections([]);
        toast({
          title: "Error",
          description: "Failed to fetch chat collections",
          variant: "destructive",
        });
      })
      .finally(() => {
        setLoadingChat(false);
      });
  };

  const fetchDbTables = () => {
    setLoadingDb(true);
    // Database tables endpoint - keeping original fetch for now as it's not in services
    fetch(`${apiUrl}/api/v1/database/tables`)
      .then((res) => res.json())
      .then(async (data) => {
        if (data.tables && data.tables.length > 0) {
          const tablesWithDetails = await Promise.all(
            data.tables.map(async (table: any) => {
              try {
                const detailResponse = await fetch(
                  `${apiUrl}/api/v1/database/table/${table.name}`
                );
                const detailData = await detailResponse.json();
                return {
                  ...table,
                  columns: detailData.columns || [],
                  sample_data: detailData.sample_data || [],
                };
              } catch (error) {
                return table;
              }
            })
          );
          setDbTables(tablesWithDetails);
        } else {
          setDbTables([]);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch database tables:", error);
      })
      .finally(() => {
        setLoadingDb(false);
      });
  };

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "pdf") {
      fetchCollections();
    } else if (activeTab === "chat") {
      fetchChatCollections();
    } else if (activeTab === "database") {
      fetchDbTables();
    }
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  const handlePdfUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    PdfUploadApi.store<UploadResponse>(formData)
      .then((data) => {
        toast({
          title: "Upload Successful",
          description: `${data.file_count} PDF(s) uploaded successfully`,
        });
        fetchCollections();
      })
      .catch((error) => {
        console.error("Upload failed:", error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload PDF files",
          variant: "destructive",
        });
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const handleChatUpload = (
    file: File,
    platform: "whatsapp" | "teams" | "slack" = "whatsapp"
  ) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("platform", platform);

    ChatUploadApi.store<ChatUploadResponse>(formData)
      .then((data) => {
        toast({
          title: "Chat Upload Successful",
          description: `${data.message_count} messages processed`,
        });
        fetchChatCollections();
      })
      .catch((error) => {
        console.error("Chat upload failed:", error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload chat file",
          variant: "destructive",
        });
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const deleteCollection = (collectionId: string) => {
    PdfCollectionApi.delete<DeleteResponse>(collectionId)
      .then(() => {
        toast({
          title: "Collection Deleted",
          description: "Collection deleted successfully",
        });
        fetchCollections();
      })
      .catch((error) => {
        console.error("Delete failed:", error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete collection",
          variant: "destructive",
        });
      });
  };

  const deleteChatCollection = (collectionId: string) => {
    ChatCollectionApi.delete<DeleteResponse>(collectionId)
      .then(() => {
        toast({
          title: "Chat Collection Deleted",
          description: "Chat collection deleted successfully",
        });
        fetchChatCollections();
      })
      .catch((error) => {
        console.error("Delete failed:", error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete chat collection",
          variant: "destructive",
        });
      });
  };

  const toggleTableExpansion = (tableName: string) => {
    setExpandedTables((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 w-80 bg-card border-r border-border transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0 md:w-0 md:border-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Workspace</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col"
        >
          <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
            <TabsTrigger
              value="pdf"
              className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              PDFs
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="database"
              className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500"
            >
              <Database className="h-4 w-4 mr-2" />
              DB
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="flex-1 flex flex-col mt-0">
            <div className="p-4 border-b border-border">
              <label htmlFor="pdf-upload">
                <Button
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                  disabled={uploading}
                  asChild
                >
                  <div>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload PDF"}
                  </div>
                </Button>
              </label>
              <input
                id="pdf-upload"
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={(e) => handlePdfUpload(e.target.files)}
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {loadingPdf ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pdfCollections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No PDF collections yet
                  </p>
                ) : (
                  <>
                    {pdfCollections.length > 50 && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Showing {pdfCollections.length} collections
                      </p>
                    )}
                    {pdfCollections.map((collection) => (
                      <Card
                        key={collection.collection_id}
                        className="p-2 hover:bg-accent/50 transition-colors group w-70"
                      >
                        <div className="flex items-center gap-2">
                          {/* Document Icon */}
                          <FileText className="h-4 w-4 text-teal-500 flex-shrink-0" />

                          {/* Title with tooltip */}
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild className="">
                                <h3 className="text-xs font-medium text-foreground truncate flex-1 cursor-default">
                                  {getCollectionTitle(collection)}
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[280px]"
                              >
                                <p className="text-xs break-words">
                                  {getCollectionTitle(collection)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={() =>
                              deleteCollection(collection.collection_id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* File list - compact */}
                        {collection.file_names &&
                          collection.file_names.length > 0 && (
                            <div className="mt-1.5 pl-6 space-y-0.5">
                              {collection.file_names
                                .slice(0, 2)
                                .map((fileName, idx) => (
                                  <TooltipProvider
                                    key={idx}
                                    delayDuration={300}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-teal-500 cursor-pointer group/file"
                                          onClick={() =>
                                            onPreviewPdf?.(
                                              collection.collection_id,
                                              fileName
                                            )
                                          }
                                        >
                                          <File className="h-2.5 w-2.5 flex-shrink-0" />
                                          <span className="truncate flex-1">
                                            {fileName}
                                          </span>
                                          <Eye className="h-2.5 w-2.5 opacity-0 group-hover/file:opacity-100 text-teal-500 flex-shrink-0" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="right"
                                        className="max-w-[300px]"
                                      >
                                        <p className="text-xs break-all">
                                          {fileName}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              {collection.file_names.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{collection.file_names.length - 2} more
                                </span>
                              )}
                            </div>
                          )}

                        {/* Meta info - compact */}
                        <div className="flex items-center gap-1.5 mt-1.5 pl-6">
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-4"
                          >
                            {collection.document_count} docs
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(collection.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
            <div className="p-4 border-b border-border">
              <label htmlFor="chat-upload">
                <Button
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                  disabled={uploading}
                  asChild
                >
                  <div>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Chat"}
                  </div>
                </Button>
              </label>
              <input
                id="chat-upload"
                type="file"
                accept=".txt"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && handleChatUpload(e.target.files[0])
                }
              />
              <p className="text-xs text-muted-foreground mt-2">
                WhatsApp export (.txt)
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {loadingChat ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : chatCollections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No chat collections yet
                  </p>
                ) : (
                  <>
                    {chatCollections.length > 50 && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Showing {chatCollections.length} collections - Scroll to
                        view all
                      </p>
                    )}
                    {chatCollections.map((collection: any) => (
                      <Card
                        key={collection.collection_id}
                        className="p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {collection.file_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {collection.message_count} messages
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {collection.platform}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              deleteChatCollection(collection.collection_id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="database" className="flex-1 flex flex-col mt-0">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {dbTables.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No database tables found
                  </p>
                ) : (
                  dbTables.map((table: any) => (
                    <Card
                      key={table.name}
                      className="p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleTableExpansion(table.name)}
                      >
                        {table.columns && table.columns.length > 0 ? (
                          expandedTables.has(table.name) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          <Database className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {table.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {table.row_count !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {table.row_count} rows
                              </Badge>
                            )}
                            {table.columns && (
                              <Badge variant="outline" className="text-xs">
                                {table.columns.length} columns
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedTables.has(table.name) &&
                        table.columns &&
                        table.columns.length > 0 && (
                          <div className="mt-3 pl-6 space-y-1 border-l-2 border-border">
                            {table.columns.map((column: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="font-mono text-muted-foreground">
                                  {column.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 py-0"
                                >
                                  {column.type}
                                </Badge>
                                {column.nullable === false && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0"
                                  >
                                    NOT NULL
                                  </Badge>
                                )}
                                {column.primary_key && (
                                  <Badge className="text-[10px] px-1 py-0 bg-teal-500">
                                    PK
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              API URL
            </label>
            <Input
              value={apiUrl}
              onChange={(e) => onApiUrlChange(e.target.value)}
              placeholder="http://localhost:8000"
              className="text-sm"
            />
          </div>
        </div>
      </aside>
    </>
  );
}
