# ⚡ Quick Reference Card

## 🔴 Sum of Digits Problem

### File Name
```
10. Sum Of Digit In Any Number.py
```

### Problem
```
Input: 123
Output: 6
```

### Solution
```python
n = int(input())
print(sum(int(d) for d in str(n)))
```

### Test Cases Generated (15 total)
```
Public Tests (5):
  123 → 6      | 999 → 27     | 0 → 0
  1 → 1        | 100 → 1

Hidden Tests (10):
  456 → 15     | 1000000 → 1  | 12345 → 15
  99999 → 45   | 777 → 21     | 2024 → 8
  555 → 15     | 1111 → 4     | 9 → 9
  10 → 1
```

---

## 🟠 Fibonacci Series Problem

### File Name
```
9. Fibonacci Series.py
```

### Problem
```
Input: 7
Output: 13
(F(1)=0, F(2)=1, F(3)=1, F(4)=2, F(5)=3, F(6)=5, F(7)=13)
```

### Solution
```python
n = int(input())
if n == 1:
    print(0)
elif n == 2:
    print(1)
else:
    a, b = 0, 1
    for _ in range(n - 2):
        a, b = b, a + b
    print(b)
```

### Test Cases Generated (15 total)
```
Public Tests (5):
  1 → 0       | 2 → 1        | 7 → 13
  10 → 34     | 5 → 3

Hidden Tests (10):
  3 → 1       | 4 → 2        | 6 → 5
  8 → 13      | 9 → 21       | 11 → 55
  12 → 89     | 15 → 377     | 20 → 4181
  25 → 75025
```

---

## 🟡 Prime Check Problem

### File Name
```
8. Prime Check.py
```

### Problem
```
Input: 17
Output: Prime

Input: 18
Output: Not Prime
```

### Solution
```python
n = int(input())
if n < 2:
    print("Not Prime")
else:
    is_prime = True
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            is_prime = False
            break
    print("Prime" if is_prime else "Not Prime")
```

### Test Cases Generated (15 total)
```
Public Tests (5):
  2 → Prime       | 17 → Prime      | 18 → Not Prime
  1 → Not Prime   | 19 → Prime

Hidden Tests (10):
  3 → Prime       | 4 → Not Prime   | 5 → Prime
  10 → Not Prime  | 11 → Prime      | 100 → Not Prime
  97 → Prime      | 121 → Not Prime | 29 → Prime
  30 → Not Prime
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Workspace
```
1. Go to: http://localhost:8080/workspace
2. Create file: "10. Sum Of Digit In Any Number.py"
3. Tag with: "red" (any color works)
```

### Step 2: Revision
```
1. Go to: http://localhost:8080/revision
2. Select: color "red"
3. Click: "Start in IDE"
```

### Step 3: Code & Test
```
1. Write your solution
2. Click "Run" to test (instant feedback on 5 public tests)
3. Click "Submit" for full grading (all 15 tests + AI review)
```

---

## 📊 Expected Behavior

### Auto-Generation ✨
```
✨ Generated 5 public + 10 hidden tests automatically!
```

### Tab Views
```
Problem Tab     → Shows problem statement + examples
Tests Tab       → Shows 5 public test cases
Result Tab      → Shows test pass/fail after clicking "Run"
Summary Tab     → Shows AI grading after "Submit"
```

### Test Results Example
```
Passed: 5/5 ✅

Test 1: ✅ PASS (0.123s)
Test 2: ✅ PASS (0.102s)
Test 3: ✅ PASS (0.145s)
Test 4: ✅ PASS (0.098s)
Test 5: ✅ PASS (0.110s)
```

### After Submit
```
Score: 9/10
Tests Passed: 14/15

Complexity: O(n) time, O(1) space
Rating: 9/10

Strengths:
- Clean, readable code
- Efficient algorithm

Improvements:
- Add input validation
- Handle edge cases better
```

---

## 🔍 Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests not generating | Click "Generate Tests" button manually |
| Tests show wrong examples | File name must match problem type exactly |
| Code fails tests | Check Test tab to see expected vs. your output |
| Timeout error | Code running too long (> 5 seconds) |
| Compilation error | Check stderr in Result tab |

---

## 📝 File Naming Convention

For auto-detection to work, use these exact formats:

```
✅ "10. Sum Of Digit In Any Number.py"
✅ "9. Fibonacci Series.py"
✅ "8. Prime Check.py"

❌ "sum_of_digits.py" (won't auto-detect)
❌ "fibonacci.py" (won't auto-detect)
❌ "prime.py" (won't auto-detect)
```

---

## ⚙️ Settings

### Revision Session Options:
```
Color Tag: red / yellow / green / blue / purple
Duration: 1 - 240 minutes (default: 30)
Problems: Select from color-tagged files
```

### Editor Options:
```
Language: Python / JavaScript / C++ / Java
Theme: Dark mode (vs-dark)
Font Size: 13px
Line Numbers: Enabled
```

---

## 📌 Pro Tips

1. **Always "Run" before "Submit"**
   - Catches most errors early
   - Saves time on hidden tests

2. **Read Constraints Carefully**
   - Each problem has specific input ranges
   - Use them to optimize your solution

3. **Check All Test Cases**
   - Even if some pass, check the ones that fail
   - The error message shows expected vs. your output

4. **Study AI Feedback**
   - Read the feedback after submit
   - Improves your coding skills

5. **Multiple Attempts**
   - Try the same problem multiple times
   - Track your score improvement

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| Revision Page | http://localhost:8080/revision |
| Workspace | http://localhost:8080/workspace |
| Dashboard | http://localhost:8080/dashboard |
| User Guide | HOW_TO_USE_REVISION.md |
| Tech Details | REVISION_PAGE_FIXES.md |
| Full Analysis | COMPREHENSIVE_ANALYSIS.md |

---

## ✅ Verification Checklist

Before each session, verify:

- [ ] File created in Workspace
- [ ] File tagged with a color
- [ ] Can see file in Revision pool
- [ ] Click "Start in IDE" loads session
- [ ] Toast shows test auto-generation
- [ ] Tests tab shows 15 test cases
- [ ] Can write code in editor
- [ ] Can click "Run" to test code
- [ ] Can click "Submit" for grading

---

## 🎓 Learning Path

```
Session 1: Understand Problem
  └─ Read statement
  └─ Study examples
  └─ Understand constraints

Session 2: Write Solution
  └─ Write basic code
  └─ Test with "Run"
  └─ Debug failures

Session 3: Optimize
  └─ Improve complexity
  └─ Add edge case handling
  └─ Submit & get AI feedback

Session 4+: Practice
  └─ Retry problem
  └─ Improve score
  └─ Move to next problem
```

---

**Status**: ✅ PRODUCTION READY
**Last Updated**: June 6, 2026
**Version**: 1.0

