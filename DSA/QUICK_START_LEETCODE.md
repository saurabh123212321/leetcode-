# 📋 LeetCode-Style Format - Quick Reference Card

## ✨ What Changed?

| Aspect | Before | After |
|--------|--------|-------|
| **Format** | Complete program with main() | Function-only (LeetCode style) |
| **Boilerplate** | User writes it | System auto-generates it |
| **User Focus** | Logic + I/O + headers | Algorithm only |
| **Code Lines** | 20-30 lines | 5-15 lines |
| **Experience** | Custom format | Industry-standard LeetCode format |

---

## 🎯 Function Signatures

### Python
```python
def sumOfDigits(n: int) -> int:      # Sum of Digits problem
def fibonacci(n: int) -> int:        # Fibonacci problem
def isPrime(n: int) -> str:          # Prime Check problem
```

### JavaScript
```javascript
function sumOfDigits(n) {            // Sum of Digits problem
function fibonacci(n) {              // Fibonacci problem
function isPrime(n) {                // Prime Check problem
```

### C++
```cpp
long long sumOfDigits(long long n) {      // Sum of Digits
long long fibonacci(long long n) {        // Fibonacci
string isPrime(long long n) {             // Prime Check
```

### Java
```java
public static long sumOfDigits(long n) {      // Sum of Digits
public static long fibonacci(long n) {        // Fibonacci
public static String isPrime(long n) {        // Prime Check
```

---

## ✅ DO - What to Write

### Sum of Digits (Python)
```python
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))
```

### Fibonacci (Python)
```python
def fibonacci(n: int) -> int:
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return a
```

### Prime Check (Python)
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

## ❌ DON'T - What NOT to Write

### ❌ Don't: Write main()
```python
# WRONG!
n = int(input())
print(sumOfDigits(n))
```

### ❌ Don't: Use print statements
```python
# WRONG!
def isPrime(n: int) -> str:
    print("Not Prime")  # ❌ NO!
    return None
```

### ❌ Don't: Include headers (C++)
```cpp
// WRONG!
#include <iostream>
using namespace std;

int main() { ... }
```

### ❌ Don't: Import everything (Java)
```java
// WRONG!
public class Main {
    public static void main(String[] args) { ... }
}
```

---

## 🔄 How It Works

```
Your Code (Function Only)
        ↓
    System Wraps It
        ↓
Complete Executable Program
        ↓
    Tests Run
        ↓
    Results
```

### Example Transformation

**You Write (Python):**
```python
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))
```

**System Runs:**
```python
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))

n = int(input())
print(sumOfDigits(n))
```

---

## 🎮 Testing Workflow

1. **View Problem** → See function signature
2. **Write Function** → Just the algorithm
3. **Click Run** → Tests 5 public cases
4. **See Results** → ✅ Pass/❌ Fail
5. **Click Submit** → Tests all 15 cases + AI grades
6. **Get Score** → 0-10 based on correctness + style

---

## 📊 Test Cases Provided

### Sum of Digits (15 total)
```
Public (5):   123→6, 999→27, 0→0, 1→1, 100→1
Hidden (10):  456→15, 1000000→1, 12345→15, 99999→45, ...
```

### Fibonacci (15 total)
```
Public (5):   1→0, 2→1, 7→13, 10→34, 5→3
Hidden (10):  3→1, 4→2, 6→5, 8→13, 9→21, ...
```

### Prime Check (15 total)
```
Public (5):   2→Prime, 17→Prime, 18→Not Prime, 1→Not Prime, 19→Prime
Hidden (10):  3→Prime, 4→Not Prime, 5→Prime, 10→Not Prime, ...
```

---

## 🎯 Common Problems

### Problem: "My function signature doesn't match"
**Solution:** Copy it exactly from the Problem tab

### Problem: "I wrote main() but it doesn't work"
**Solution:** Don't write main()! Just the function

### Problem: "I used print() but output is wrong"
**Solution:** Use return statements, not print()

### Problem: "How do I read input?"
**Solution:** You don't! Just implement the function. System handles I/O

---

## ⚡ Quick Examples

### Sum of Digits - All Languages

**Python**
```python
def sumOfDigits(n: int) -> int:
    return sum(int(d) for d in str(n))
```

**JavaScript**
```javascript
function sumOfDigits(n) {
    return String(n).split('').reduce((a, b) => a + Number(b), 0);
}
```

**C++**
```cpp
long long sumOfDigits(long long n) {
    long long sum = 0;
    while (n) { sum += n % 10; n /= 10; }
    return sum;
}
```

**Java**
```java
public static long sumOfDigits(long n) {
    long sum = 0;
    while (n > 0) { sum += n % 10; n /= 10; }
    return sum;
}
```

---

### Fibonacci - All Languages

**Python**
```python
def fibonacci(n: int) -> int:
    a, b = 0, 1
    for _ in range(n - 1):
        a, b = b, a + b
    return a
```

**JavaScript**
```javascript
function fibonacci(n) {
    let a = 0, b = 1;
    for (let i = 0; i < n - 1; i++) {
        [a, b] = [b, a + b];
    }
    return a;
}
```

**C++**
```cpp
long long fibonacci(long long n) {
    long long a = 0, b = 1;
    for (int i = 0; i < n - 1; i++) {
        long long tmp = a + b;
        a = b; b = tmp;
    }
    return a;
}
```

**Java**
```java
public static long fibonacci(long n) {
    long a = 0, b = 1;
    for (int i = 0; i < n - 1; i++) {
        long tmp = a + b;
        a = b; b = tmp;
    }
    return a;
}
```

---

### Prime Check - All Languages

**Python**
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

**JavaScript**
```javascript
function isPrime(n) {
    if (n <= 1) return "Not Prime";
    if (n === 2) return "Prime";
    if (n % 2 === 0) return "Not Prime";
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return "Not Prime";
    }
    return "Prime";
}
```

**C++**
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

**Java**
```java
public static String isPrime(long n) {
    if (n <= 1) return "Not Prime";
    if (n == 2) return "Prime";
    if (n % 2 == 0) return "Not Prime";
    for (long i = 3; i * i <= n; i += 2) {
        if (n % i == 0) return "Not Prime";
    }
    return "Prime";
}
```

---

## 📈 Test Format

**Input:** Single number from stdin
**Output:** Single value to stdout
**No Interactive Prompts:** System handles all I/O

### Example Test Case
```
Input:  123
Output: 6

Input:  17
Output: Prime

Input:  7
Output: 13
```

---

## 🚀 Get Started

1. Go to: http://localhost:8081/revision
2. Select color and start session
3. Look at function signature in Problem tab
4. Write the function in the editor
5. Click "Generate Tests"
6. Click "Run"
7. See results
8. Click "Submit"
9. Get AI-graded score!

---

**Last Updated**: June 6, 2026
**Format**: LeetCode-Style 2.0
**Status**: ✅ Production Ready

Happy Coding! 🎓🚀

