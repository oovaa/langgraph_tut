def fibonacci(n):
    fib_sequence = [0, 1]
    for i in range(2, n):
        next_fib = fib_sequence[-1] + fib_sequence[-2]
        fib_sequence.append(next_fib)
    return fib_sequence

# Print the first 15 Fibonacci numbers
fib_numbers = fibonacci(15)
for num in fib_numbers:
    print(num)