import os

skeleton_block = """  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 relative z-10">
          <div className="mb-12">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col bg-white rounded-xl shadow-soft border border-slate-100 overflow-hidden h-[380px]">
                <Skeleton className="w-full h-48 rounded-none" />
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-10 w-28 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }"""

def replace_loader(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the loading block
    start_str = "  if (loading) {"
    if start_str not in content:
        return

    start_idx = content.find(start_str)
    
    # We find the matching end brace for the if block
    # It ends when we see the next `  if (error)` or something similar
    error_idx = content.find("  if (error)", start_idx)
    if error_idx == -1:
        # Just find the end of the block manually
        return
        
    old_block = content[start_idx:error_idx]
    content = content.replace(old_block, skeleton_block + "\n\n")

    # Ensure Skeleton is imported
    if "import { Skeleton }" not in content:
        content = content.replace("import { Spinner }", "import { Spinner }\nimport { Skeleton }")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

replace_loader("src/pages/MyLearningPage.tsx")
replace_loader("src/pages/CoursesPage.tsx")
