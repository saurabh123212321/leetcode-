# 🎬 Complete Walkthrough Example - LeetCode-Style Revision

## Step-by-Step: Solving Prime Check Problem

---

## 📍 Step 1: Go to Revision Page

**URL**: http://localhost:8081/revision

**Screen Shows:**
```
✓ Pick a color tag (red/yellow/green/blue/purple)
✓ Choose question duration (default 30 min)
✓ List of problems tagged with that color
```

**Action**: 
- Select color: **Red** 🔴
- Duration: **30** minutes
- Click on "8. Prime Check.cpp" problem
- Click **"Start in IDE"**

---

## 📋 Step 2: Session Starts - View Problem Tab

**Automatic actions:**
- ✅ Editor opens with function template
- ✅ Tests auto-generate
- ✅ Toast shows: "✨ Generated 5 public + 10 hidden tests automatically!"

**Screen shows:**

### Problem Tab
```
═══════════════════════════════════════════════════════════
Prime Check
───────────────────────────────────────────────────────────
Determine if an integer is a prime number.

Function Signature:
┌─────────────────────────────────────────────────────────┐
│ string isPrime(long long n) {                           │
└─────────────────────────────────────────────────────────┘

Constraints:
n is a positive integer (1 <= n <= 10^9)
Return: "Prime" or "Not Prime"

Examples:

1. Input: 2          → Output: Prime
   2 is prime (smallest prime)

2. Input: 17         → Output: Prime
   17 is prime

3. Input: 18         → Output: Not Prime
   18 is composite

4. Input: 1          → Output: Not Prime
   1 is not prime by definition

─────────────────────────────────────────────────────────

💡 LeetCode-style coding: Write ONLY the function body
✅ What to do: Implement the function logic
❌ What NOT to do: Don't include main(), headers, etc.
```

---

## ✏️ Step 3: Write Your Solution

**Editor shows template:**
```cpp
string isPrime(long long n) {
  // Write your function here
}
```

**You write:**
```cpp
string isPrime(long long n) {
  // Handle edge cases
  if (n <= 1) {
    return "Not Prime";
  }
  
  // 2 is the only even prime
  if (n == 2) {
    return "Prime";
  }
  
  // All other even numbers are not prime
  if (n % 2 == 0) {
    return "Not Prime";
  }
  
  // Check odd divisors up to sqrt(n)
  for (long long i = 3; i * i <= n; i += 2) {
    if (n % i == 0) {
      return "Not Prime";
    }
  }
  
  // If no divisors found, it's prime
  return "Prime";
}
```

**Result in Editor:**
```cpp
string isPrime(long long n) {
  if (n <= 1) {
    return "Not Prime";
  }
  if (n == 2) {
    return "Prime";
  }
  if (n % 2 == 0) {
    return "Not Prime";
  }
  for (long long i = 3; i * i <= n; i += 2) {
    if (n % i == 0) {
      return "Not Prime";
    }
  }
  return "Prime";
}
```

---

## 🧪 Step 4: View Generated Tests

**Click on "Tests" tab**

**Screen shows:**
```
═══════════════════════════════════════════════════════════
Tests (5)
───────────────────────────────────────────────────────────

📊 Total: 5 public test cases + 10 hidden test cases
   (shown below)

Test 1 — 2 is prime
┌─────────────────────────────────────────────────────────┐
│ Input  │ 2                                              │
├─────────────────────────────────────────────────────────┤
│ Output │ Prime                                          │
└─────────────────────────────────────────────────────────┘

Test 2 — 17 is prime
┌─────────────────────────────────────────────────────────┐
│ Input  │ 17                                             │
├─────────────────────────────────────────────────────────┤
│ Output │ Prime                                          │
└─────────────────────────────────────────────────────────┘

Test 3 — 18 is not prime
┌─────────────────────────────────────────────────────────┐
│ Input  │ 18                                             │
├─────────────────────────────────────────────────────────┤
│ Output │ Not Prime                                      │
└─────────────────────────────────────────────────────────┘

Test 4 — 1 is not prime by definition
┌─────────────────────────────────────────────────────────┐
│ Input  │ 1                                              │
├─────────────────────────────────────────────────────────┤
│ Output │ Not Prime                                      │
└─────────────────────────────────────────────────────────┘

Test 5 — 19 is prime
┌─────────────────────────────────────────────────────────┐
│ Input  │ 19                                             │
├─────────────────────────────────────────────────────────┤
│ Output │ Prime                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ▶️ Step 5: Run Tests (Click "Run" Button)

**System does:**
1. Takes your function code
2. Wraps it with main():
   ```cpp
   #include <bits/stdc++.h>
   using namespace std;
   
   string isPrime(long long n) {
     // your code here
   }
   
   int main() {
     long long n;
     cin >> n;
     cout << isPrime(n);
     return 0;
   }
   ```
3. Compiles the C++ program
4. Runs against 5 test cases
5. Captures output for each test

**Screen shows:**
```
═══════════════════════════════════════════════════════════
Result
───────────────────────────────────────────────────────────

✅ Test 1: isPrime(2)
   Input: 2
   Output: Prime
   Expected: Prime
   Status: PASSED ✓

✅ Test 2: isPrime(17)
   Input: 17
   Output: Prime
   Expected: Prime
   Status: PASSED ✓

✅ Test 3: isPrime(18)
   Input: 18
   Output: Not Prime
   Expected: Not Prime
   Status: PASSED ✓

✅ Test 4: isPrime(1)
   Input: 1
   Output: Not Prime
   Expected: Not Prime
   Status: PASSED ✓

✅ Test 5: isPrime(19)
   Input: 19
   Output: Prime
   Expected: Prime
   Status: PASSED ✓

═══════════════════════════════════════════════════════════
RESULT: 5/5 tests passed ✨
═══════════════════════════════════════════════════════════
```

---

## 📤 Step 6: Submit for Full Grading (Click "Submit" Button)

**System does:**
1. Wraps your code again
2. Runs ALL 15 tests:
   - 5 public (same as before)
   - 10 hidden (you didn't see these!)
3. AI analyzes code quality:
   - Correctness
   - Efficiency
   - Code style
   - Edge case handling
4. Generates score (0-10)

**Screen shows:**
```
═══════════════════════════════════════════════════════════
Summary
───────────────────────────────────────────────────────────

Test Results: 15/15 PASSED ✅
┌─────────────────────────────────────────────────────────┐
│ Public Tests:  5/5 passed                              │
│ Hidden Tests: 10/10 passed                             │
│ Overall: PERFECT! ✨                                   │
└─────────────────────────────────────────────────────────┘

AI Grading Analysis
┌─────────────────────────────────────────────────────────┐
│ Correctness: 10/10                                     │
│   • All test cases passed                              │
│   • Handles edge cases correctly (n=1, n=2)           │
│   • Efficient algorithm (O(√n))                        │
│                                                        │
│ Code Quality: 9/10                                    │
│   • Clear logic and structure                         │
│   • Good variable names                               │
│   • Could add more comments                           │
│                                                        │
│ Efficiency: 10/10                                     │
│   • Optimal algorithm for prime checking              │
│   • No unnecessary operations                         │
│   • Handles large numbers (up to 10^9)               │
│                                                        │
│ Overall Score: 9.7/10 ✨                             │
└─────────────────────────────────────────────────────────┘

Detailed Feedback:
• Excellent implementation of prime checking algorithm
• Efficient use of sqrt optimization
• Could improve by adding explanatory comments
• Consider handling negative numbers (not in constraints)
• Solution ready for production use

Session Complete!
• Duration: 12:34 (out of 30:00)
• Status: SUBMITTED
• Time Used: 12 minutes 34 seconds
```

---

## 📊 Comparison: Before vs After

### ❌ Before (Old Format)

**You had to write:**
```cpp
#include <iostream>
#include <cmath>
using namespace std;

int main() {
    long long n;
    cin >> n;
    
    if (n <= 1) {
        cout << "Not Prime";
        return 0;
    }
    if (n == 2) {
        cout << "Prime";
        return 0;
    }
    if (n % 2 == 0) {
        cout << "Not Prime";
        return 0;
    }
    for (long long i = 3; i * i <= n; i += 2) {
        if (n % i == 0) {
            cout << "Not Prime";
            return 0;
        }
    }
    cout << "Prime";
    return 0;
}
```

**Problems:**
- 🤔 What headers to include?
- 😕 Need to handle I/O myself
- 🤷 Is this the right format?
- 😫 So much boilerplate!
- ⏱️ Takes too long to write

---

### ✅ After (LeetCode-Style)

**You write:**
```cpp
string isPrime(long long n) {
  if (n <= 1) return "Not Prime";
  if (n == 2) return "Prime";
  if (n % 2 == 0) return "Not Prime";
  
  for (long long i = 3; i * i <= n; i += 2) {
    if (n % i == 0) return "Not Prime";
  }
  
  return "Prime";
}
```

**Benefits:**
- ✅ Clear function signature provided
- ✅ System handles I/O automatically
- ✅ Same format as LeetCode
- ✅ Focus on algorithm
- ⚡ Write 60% faster!

---

## 🎯 Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Lines of Code** | 24 lines | 9 lines |
| **Time to Write** | 5-8 minutes | 2-3 minutes |
| **User Focus** | Algorithm + I/O + Headers | **Algorithm only** |
| **Boilerplate** | Write manually | **System auto-generates** |
| **Error Rate** | High (forgot headers?) | **Low (clear template)** |
| **Confidence** | Unsure about format | **100% confident** |

---

## 💡 What System Auto-Generates

**Your Function:**
```cpp
string isPrime(long long n) {
  // your code
}
```

**System Adds (Transparent to You):**
```cpp
#include <bits/stdc++.h>  // ← System
using namespace std;       // ← System

string isPrime(long long n) {
  // your code
}

int main() {                       // ← System
  long long n;                     // ← System
  cin >> n;                        // ← System
  cout << isPrime(n);              // ← System
  return 0;                        // ← System
}                                  // ← System
```

**Result:** Complete executable program that:
1. Reads input from stdin
2. Calls your function
3. Prints the output
4. Exits cleanly

---

## 🎓 Why This Format?

### Industry Standard
- ✅ Same as LeetCode
- ✅ Same as HackerRank
- ✅ Same as Codeforces
- ✅ Same as job interviews

### Learning Benefits
- ✅ Focus on algorithm
- ✅ Learn production-quality functions
- ✅ Build interview confidence
- ✅ Faster problem-solving

### Practical Benefits
- ✅ Less code to write
- ✅ Fewer syntax errors
- ✅ Clearer intent
- ✅ Better for code review

---

## 🚀 Ready to Try?

1. **Go to**: http://localhost:8081/revision
2. **Pick** a color (red/yellow/green/blue/purple)
3. **Start** a session with any problem
4. **Write** a function (no main()!)
5. **Run** tests
6. **Submit** for grading
7. **Get** AI feedback

---

## 📝 Quick Checklist

When writing your function:

- [ ] Start with function signature from Problem tab
- [ ] Write only the function body
- [ ] Don't include #include, import, using namespace, etc.
- [ ] Don't write main()
- [ ] Use return statements, not print/cout
- [ ] Follow the exact function signature
- [ ] Test with "Run" button (public tests)
- [ ] Submit with "Submit" button (all tests + AI grade)

---

## ✅ Example Solutions Available

### Sum of Digits (All Languages)
- Python, JavaScript, C++, Java examples in QUICK_START_LEETCODE.md

### Fibonacci (All Languages)
- Python, JavaScript, C++, Java examples in QUICK_START_LEETCODE.md

### Prime Check (All Languages)
- Python, JavaScript, C++, Java examples in QUICK_START_LEETCODE.md

---

**Ready to code?** 🎓

Visit: http://localhost:8081/revision

**Last Updated**: June 6, 2026
**Format**: LeetCode-Style 2.0 ✨

