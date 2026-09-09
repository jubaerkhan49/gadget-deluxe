from django import template

register = template.Library()

@register.filter(name='replace_underscores')
def replace_underscores(value):
    if isinstance(value, str):
        return value.replace('_', ' ')
    return value
