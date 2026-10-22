"""
Copilot API Views:
Exposes authenticated chat interface for web frontend and Android application.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .service import CopilotService

class CopilotChatAPIView(APIView):
    """
    POST /api/copilot/chat/
    Body:
    {
        "message": "How many iPhone 15 Pro Max do we have in stock?",
        "history": [
            {"role": "user", "text": "Hi"},
            {"role": "model", "text": "Hello! How can I assist with inventory today?"}
        ]
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response(
                {"error": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        history = request.data.get('history', [])
        username = request.user.username if request.user.is_authenticated else None

        result = CopilotService.process_chat(
            user_message=user_message,
            history=history,
            user_username=username
        )

        return Response(result, status=status.HTTP_200_OK)
