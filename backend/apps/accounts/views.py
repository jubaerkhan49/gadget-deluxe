from django.contrib.auth import login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import render, redirect
from django.views import View
from django.contrib import messages

class LoginView(View):
    def get(self, request):
        if request.user.is_authenticated:
            return redirect('dashboard:index')
        form = AuthenticationForm()
        return render(request, 'accounts/login.html', {'form': form})

    def post(self, request):
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"Welcome back, {user.username}!")
            next_url = request.GET.get('next', 'dashboard:index')
            return redirect(next_url)
        else:
            messages.error(request, "Invalid username or password.")
            return render(request, 'accounts/login.html', {'form': form})

class LogoutView(View):
    def get(self, request):
        logout(request)
        messages.info(request, "You have been logged out.")
        return redirect('accounts:login')
    
    def post(self, request):
        logout(request)
        messages.info(request, "You have been logged out.")
        return redirect('accounts:login')
