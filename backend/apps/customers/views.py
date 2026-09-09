from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from .models import Customer

class CustomerListView(LoginRequiredMixin, View):
    def get(self, request):
        customers = Customer.objects.prefetch_related('sales').all()
        return render(request, 'customers/list.html', {'customers': customers})

    def post(self, request):
        name = request.POST.get('name', '').strip()
        phone = request.POST.get('phone', '').strip()
        address = request.POST.get('address', '').strip()
        facebook = request.POST.get('facebook', '').strip()

        if not name or not phone:
            messages.error(request, "Name and Phone number are required.")
            return redirect('customers:list')

        Customer.objects.create(name=name, phone=phone, address=address, facebook=facebook)
        messages.success(request, f"Customer '{name}' added successfully.")
        return redirect('customers:list')


class CustomerDeleteView(LoginRequiredMixin, View):
    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        customer = get_object_or_404(Customer, pk=pk)
        name = customer.name
        customer.delete()
        messages.success(request, f"Customer '{name}' deleted successfully.")
        return redirect('customers:list')

