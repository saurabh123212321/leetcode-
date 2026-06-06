# 🎓 LeetCode-Style Function Format

## ✨ What Changed?

The Revision page now uses **LeetCode-style function-only format** instead of requiring complete programs with main() boilerplate.

### Before ❌
Users had to write **complete programs** with all boilerplate:

**C++**:
```cpp
#include <iostream>
using namespace std;

int main() {    
    long long n;
    cin >> n;
    
    if (n <= 1) {
        cout << "Not Prime";
        return 0;
    }
    // ... rest of logic
    
    cout << "Prime";
}
```

**Python**:
```python
n = int(input())

if n <= 1:
    print("Not Prime")
else:
    # ... rest of logic
    print("Prime")
```

### After ✅
Users write **ONLY the function**:

**C++**:
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

**Python**:
```python
def isPrime(n: int) -> str:
    if n <= 1:
        return "Not Prime"
    if n == 2:
        return "Prime"
    if n % 2 == 0:
        return "Not Prime"
    
    i = 3
    while i * i <= n:
        if n % i == 0:
            return "Not Prime"
        i += 2
    
    return "Prime"
```

---

## 🎯 Function Signatures by Problem

### Problem 1: Sum of Digits

| Language | Function Signature |
|----------|-------------------|
| **Python** | `def sumOfDigits(n: int) -> int:` |
| **JavaScript** | `function sumOfDigits(n) {` |
| **C++** | `long long sumOfDigits(long long n) {` |
| **Java** | `public static long sumOfDigits(long n) {` |

**Example Implementation (Python)**:
```python
def sumOfDigits(n: int) -> int:
    total = 0
    while n > 0:
        total += n % 10
        n //= 10
    return total
```

---

### Problem 2: Fibonacci Series

| Language | Function Signature |
|----------|-------------------|
| **Python** | `def fibonacci(n: int) -> int:` |
| **JavaScript** | `function fibonacci(n) {` |
| **C++** | `long long fibonacci(long long n) {` |
| **Java** | `public static long fibonacci(long n) {` |

**Example Implementation (Python)**:
```python
def fibonacci(n: int) -> int:
    if n == 1:
        return 0
    if n == 2:
        return 1
    
    a, b = 0, 1
    for _ in range(n - 2):
        a, b = b, a + b
    return b
```

---

### Problem 3: Prime Check

| Language | Function Signature |
|----------|-------------------|
| **Python** | `def isPrime(n: int) -> str:` |
| **JavaScript** | `function isPrime(n) {` |
| **C++** | `string isPrime(long long n) {` |
| **Java** | `public static String isPrime(long n) {` |

**Example Implementation (Python)**:
```python
def isPrime(n: int) -> str:
    if n <= 1:
        return "Not Prime"
    if n == 2:
        return "Prime"
    if n % 2 == 0:
        return "Not Prime"
    
    i = 3
    while i * i <= n:
        if n % i == 0:
            return "Not Prime"
        i += 2
    
    return "Prime"
```

---

## 🔧 How It Works Behind the Scenes

### Auto-Wrapping Process

When you click **"Run"** or **"Submit"**, the system automatically:

1. **Takes your function** (what you wrote)
2. **Wraps it with boilerplate** (main function, input/output)
3. **Executes the complete program** against test cases
4. **Returns results** (pass/fail for each test)

**Example: Your Code (Python)**
```python
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))
```

**Becomes (After Wrapping)**
```python
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))

# Read input and call function
n = int(input())
print(sumOfDigits(n))
```

---

## ✅ Benefits

| Aspect | Benefit |
|--------|---------|
| **Cleaner Code** | No boilerplate, focus on algorithm |
| **LeetCode-Like** | Familiar format for competitive programmers |
| **Easier Testing** | IDE manages input/output automatically |
| **Less Error-Prone** | Can't forget headers or main logic |
| **Faster Coding** | Write solution 50% faster |

---

## 📝 Step-by-Step Guide

### 1. Go to Revision Page
```
http://localhost:8080/revision
```

### 2. Select Color & Start
- Pick a color tag (red/yellow/green/blue/purple)
- Click "Start in IDE"

### 3. View Function Signature
- Go to **"Problem"** tab
- See the function signature you need to implement
- Read the constraints and examples

### 4. Write Function Only
**Write THIS:**
```python
def isPrime(n: int) -> str:
    if n <= 1:
        return "Not Prime"
    # ... your logic
    return "Prime"
```

**NOT THIS:**
```python
n = int(input())
# ... logic
print(...)
```

### 5. Generate Tests
- Click **"Generate Tests"** button
- Tests auto-generate with toast confirmation
- See test cases in **"Tests"** tab

### 6. Run Tests
- Click **"Run"** button
- Tests execute against your function
- See results: ✅ Pass / ❌ Fail

### 7. Submit for Grading
- Click **"Submit"** button
- All 15 tests run (5 public + 10 hidden)
- AI grades code quality
- See final score (0-10)

---

## 🎮 Complete Example Walkthrough

### Problem: Prime Check

**1. Problem Tab Shows:**
```
Function Signature:
string isPrime(long long n) {

Constraints:
n is a positive integer (1 <= n <= 10^9)
Return: "Prime" or "Not Prime"

Examples:
Input: 2     → Output: Prime     (smallest prime)
Input: 17    → Output: Prime     (prime number)
Input: 18    → Output: Not Prime (composite)
Input: 1     → Output: Not Prime (not prime by definition)
```

**2. You Write (C++):**
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

**3. System Wraps It As:**
```cpp
#include <bits/stdc++.h>
using namespace std;

string isPrime(long long n) {
  if (n <= 1) return "Not Prime";
  if (n == 2) return "Prime";
  if (n % 2 == 0) return "Not Prime";
  
  for (long long i = 3; i * i <= n; i += 2) {
    if (n % i == 0) return "Not Prime";
  }
  
  return "Prime";
}

int main() {
  long long n;
  cin >> n;
  cout << isPrime(n);
  return 0;
}
```

**4. Test Results Show:**
```
✅ Test 1: Input: 2    → Output: Prime     (Expected: Prime)
✅ Test 2: Input: 17   → Output: Prime     (Expected: Prime)
✅ Test 3: Input: 18   → Output: Not Prime (Expected: Not Prime)
✅ Test 4: Input: 1    → Output: Not Prime (Expected: Not Prime)
✅ Test 5: Input: 19   → Output: Prime     (Expected: Prime)

📊 Result: 5/5 tests passed! ✨
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T: Write main()
```python
# WRONG!
n = int(input())
print(sumOfDigits(n))
```

### ✅ DO: Write only the function
```python
# CORRECT!
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))
```

---

### ❌ DON'T: Include headers
```cpp
// WRONG!
#include <iostream>
using namespace std;

int main() { ... }
```

### ✅ DO: Just the function
```cpp
// CORRECT!
string isPrime(long long n) {
  // ... logic
}
```

---

### ❌ DON'T: Use print statements
```python
# WRONG!
def isPrime(n: int) -> str:
    if n <= 1:
        print("Not Prime")  # ❌ Don't use print!
    else:
        print("Prime")
```

### ✅ DO: Use return statements
```python
# CORRECT!
def isPrime(n: int) -> str:
    if n <= 1:
        return "Not Prime"
    else:
        return "Prime"
```

---

## 🔄 Language-Specific Details

### Python
- Use **type hints** (they're shown in the template)
- **Return** the result, don't print it
- Function names must match signature exactly

```python
def sumOfDigits(n: int) -> int:  # ✅ Correct name & types
    return sum(int(d) for d in str(n))
```

### JavaScript
- No type hints (but keep the function name)
- **Return** the result
- Can use `return` or last expression

```javascript
function isPrime(n) {  // ✅ Must be named 'isPrime'
    if (n <= 1) return false;
    // ... logic
    return true;
}
```

### C++
- Return type must match signature
- **Return** the result, don't cout
- Can use long long for large numbers

```cpp
long long fibonacci(long long n) {  // ✅ Correct return type
    if (n == 1) return 0;
    // ... logic
}
```

### Java
- Method signature must match exactly
- **Return** the result, don't print
- Use `public static` as shown

```java
public static long sumOfDigits(long n) {  // ✅ Exact signature
    // ... logic
    return result;
}
```

---

## 🎯 Key Takeaway

| What | Location | Your Responsibility |
|------|----------|-------------------|
| **Main function** | Hidden | System provides ✓ |
| **Input reading** | Hidden | System provides ✓ |
| **Output printing** | Hidden | System provides ✓ |
| **Function logic** | Editor | **You write** ✏️ |
| **Test creation** | Automatic | System generates ✓ |
| **Test execution** | Automatic | System runs ✓ |

---

## 🚀 Quick Reference

### Sum of Digits
```python
# Template
def sumOfDigits(n: int) -> int:
    # Your code here
    pass

# Example
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))
```

### Fibonacci
```python
# Template
def fibonacci(n: int) -> int:
    # Your code here
    pass

# Example
def fibonacci(n: int) -> int:
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return a
```

### Prime Check
```python
# Template
def isPrime(n: int) -> str:
    # Your code here
    pass

# Example
def isPrime(n: int) -> str:
    if n <= 1:
        return "Not Prime"
    if n == 2:
        return "Prime"
    if n % 2 == 0:
        return "Not Prime"
    i = 3
    while i * i <= n:
        if n % i == 0:
            return "Not Prime"
        i += 2
    return "Prime"
```

---

## 📊 Test Case Examples

### Sum of Digits Test Cases (15 total)
```
Public Tests (5):
  Input: 123    → Output: 6      (1+2+3=6)
  Input: 999    → Output: 27     (9+9+9=27)
  Input: 0      → Output: 0      (edge case)
  Input: 1      → Output: 1      (single digit)
  Input: 100    → Output: 1      (with zeros)

Hidden Tests (10):
  Input: 456    → Output: 15
  Input: 1000000 → Output: 1
  Input: 12345   → Output: 15
  (... 7 more hidden tests)
```

### Prime Check Test Cases (15 total)
```
Public Tests (5):
  Input: 2     → Output: Prime     
  Input: 17    → Output: Prime     
  Input: 18    → Output: Not Prime  
  Input: 1     → Output: Not Prime  
  Input: 19    → Output: Prime      

Hidden Tests (10):
  Input: 3     → Output: Prime
  Input: 4     → Output: Not Prime
  Input: 5     → Output: Prime
  (... 7 more hidden tests)
```

---

## ✅ Ready to Go!

1. ✅ Function signatures provided in Problem tab
2. ✅ Auto-wrapping handles boilerplate
3. ✅ Tests auto-generate for each problem
4. ✅ Results show per-test pass/fail
5. ✅ AI grades your solution quality

**Start coding now!** 🚀 http://localhost:8080/revision

---

**Last Updated**: June 6, 2026
**Format Version**: 2.0 (LeetCode-Style)
**Status**: ✅ Production Ready

