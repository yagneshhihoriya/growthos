export type LibraryJob = {
  id: string;
  productId: string | null;
  originalUrl: string;
  processedUrls: Record<string, string> | null;
  createdAt: string;
  completedAt: string | null;
  product?: { id: string; name: string } | null;
};

export type LibraryBatchStyleEntry = {
  jobId: string;
  /** Style key from options.style, e.g. "white_bg". Null if this row isn't multi-studio. */
  style: string | null;
  /** The generated image URL (viewer-path) or null if the child failed. */
  imageUrl: string | null;
};

export type LibraryBatchItem = {
  kind: "batch";
  batchId: string;
  createdAt: string;
  completedAt: string | null;
  totalImages: number;
  doneImages: number;
  originalUrl: string;
  styles: LibraryBatchStyleEntry[];
  product?: { id: string; name: string } | null;
};

export type LibrarySingleItem = {
  kind: "single";
  job: LibraryJob;
};

export type LibraryItem = LibrarySingleItem | LibraryBatchItem;
