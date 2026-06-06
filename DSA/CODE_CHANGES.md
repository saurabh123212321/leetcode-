# Code Changes Summary - AI Problem Generation

## File 1: `src/lib/revision.functions.ts`

### Added: New Server Function (Lines 7-110)

```typescript
/** Generate problem statement + test cases dynamically via AI for any file */
export const generateProblemStatementAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    file_name: z.string().min(1),
    file_content: z.string().max(20000),
    language: z.string(),
  }).parse(i))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    
    // 1. Generate problem statement via AI
    // 2. Generate test cases via AI
    // 3. Return structured data with fallback
    // ... (see implementation file for full code)
  });
```

**Key Features:**
- Takes: `file_name`, `file_content`, `language`
- Returns: `{ title, description, functionSig, constraints, examples, testCases }`
- Calls Lovable AI (Google Gemini 3 Flash) twice
- Fallback: Returns template if API unavailable
- Location: Top of file after imports

---

## File 2: `src/routes/_authenticated/revision.tsx`

### Change 1: Import New Function (Line 5)

**Before:**
```typescript
import { getRevisionFiles, startRevisionSession, submitRevisionSession, listRevisionSessions } from "@/lib/revision.functions";
```

**After:**
```typescript
import { getRevisionFiles, startRevisionSession, submitRevisionSession, listRevisionSessions, generateProblemStatementAI } from "@/lib/revision.functions";
```

---

### Change 2: Add Hook for AI Function (Around Line 523)

**After existing hooks:**
```typescript
const genProblemFn = useServerFn(generateProblemStatementAI);
```

---

### Change 3: Add New State Variable (Around Line 545)

**After existing state:**
```typescript
// problem data (AI-generated)
const [problemData, setProblemData] = useState<{ 
  title: string; 
  description: string; 
  functionSig: string; 
  constraints: string; 
  examples: any[] 
} | null>(null);
```

---

### Change 4: Update handleStart() Function (Around Line 631)

**Before:**
```typescript
async function handleStart(file: FileRow) {
  try {
    const r = await startFn({ data: { /* ... */ } });
    // ... setup code ...
    setTests(null);
    setRunResult(null);
    setSummary(null);
    setTab("problem");
    // Auto-generate tests when session starts
    await generateTestsForFile(file, true);
  } catch (e: any) { toast.error(e.message); }
}
```

**After:**
```typescript
async function handleStart(file: FileRow) {
  try {
    const r = await startFn({ data: { /* ... */ } });
    // ... setup code ...
    setTests(null);
    setProblemData(null);  // ← NEW: Clear problem data
    setRunResult(null);
    setSummary(null);
    setTab("problem");
    
    // NEW: AI-generate problem statement dynamically
    try {
      const problemStatement = await genProblemFn({ data: { 
        file_name: file.name, 
        file_content: file.content || "", 
        language: detected 
      }});
      setProblemData({
        title: problemStatement.title,
        description: problemStatement.description,
        functionSig: problemStatement.functionSig || getFunctionSignature(file.name, detected),
        constraints: problemStatement.constraints,
        examples: problemStatement.examples,
      });
      toast.success("✨ Problem statement generated via AI");
    } catch (e) {
      console.error("Problem generation failed:", e);
      // Fallback: use buildLeetCodeProblem for backward compatibility
      const fallback = buildLeetCodeProblem(file.name, file.content || "", detected);
      setProblemData(fallback);
      toast.info("Using template problem description");
    }
    
    // Auto-generate tests when session starts
    await generateTestsForFile(file, true);
  } catch (e: any) { toast.error(e.message); }
}
```

---

### Change 5: Update JSX to Use AI Problem Data (Around Line 863)

**Before:**
```jsx
{tab === "problem" && (
  <div className="space-y-4">
    <div className="text-base font-semibold">
      {buildLeetCodeProblem(activeFile?.name ?? "Revision Problem", activeFile?.content || "", lang).title}
    </div>
    <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-xs space-y-4">
      <div className="space-y-2">
        <p className="text-slate-300">
          {buildLeetCodeProblem(activeFile?.name ?? "Revision Problem", activeFile?.content || "", lang).description}
        </p>
        {/* ... more hardcoded calls ... */}
```

**After:**
```jsx
{tab === "problem" && (
  <div className="space-y-4">
    <div className="text-base font-semibold">
      {problemData?.title || (activeFile && buildLeetCodeProblem(activeFile.name, activeFile.content || "", lang).title)}
    </div>
    <div className="rounded border border-slate-800 bg-slate-900/50 p-3 text-xs space-y-4">
      <div className="space-y-2">
        <p className="text-slate-300">
          {problemData?.description || (activeFile && buildLeetCodeProblem(activeFile.name, activeFile.content || "", lang).description)}
        </p>
        {/* ... display AI data with fallback ... */}
```

**Key Pattern:** All JSX that was calling `buildLeetCodeProblem()` now uses `problemData` with fallback:
```typescript
{problemData?.property || (activeFile && buildLeetCodeProblem(...).property)}
```

---

## Summary of Changes

| File | Changes | Type |
|------|---------|------|
| `revision.functions.ts` | +1 new server function (100 lines) | Addition |
| `revision.tsx` | Import + 1 hook + 1 state + 1 function + JSX updates | Modification |
| `buildLeetCodeProblem()` | Still exists as fallback | Unchanged |
| `generateProblemTestCases()` | Still exists as fallback | Unchanged |

**Total Lines Added:** ~150
**Total Lines Changed:** ~40 (JSX pattern updates)
**Breaking Changes:** None
**API Changes:** Stable

---

## Migration Path

### For Existing Deployments:
1. Pull latest code
2. Run `npm run build`
3. Test with existing files (backward compatible)
4. Test with new files (now AI-generated)
5. Deploy when ready

### Rollback Plan:
If issues arise, simply revert to remove `generateProblemStatementAI` calls and it falls back to `buildLeetCodeProblem()` automatically.

---

## Testing the Changes

### Quick Test:
```bash
# Terminal 1
npm run dev

# Terminal 2 (in 10 seconds)
curl http://localhost:8081

# Browser: Test "Start in IDE" on any file
```

### Verification:
- Toast shows: "✨ Problem statement generated via AI"
- Problem tab displays multi-paragraph description
- Examples show different inputs/outputs
- Tests auto-generated (5 public + 10 hidden)
