import axios from 'axios';

/**
 * 서비스 장애 및 주요 이벤트 알림용 Slack Notifier
 */
export async function sendSlackNotification(message: string, data?: any) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const payload = {
      text: `🚨 *[동플 허브] TourAPI 연동 알림*`,
      attachments: [
        {
          color: data ? '#ff0000' : '#36a64f',
          fields: [
            { title: '메시지', value: message, short: false },
            { title: '시간', value: new Date().toLocaleString(), short: true },
            { title: '데이터', value: data ? JSON.stringify(data).substring(0, 500) : 'N/A', short: false }
          ]
        }
      ]
    };

    await axios.post(webhookUrl, payload);
  } catch (err) {
    console.error('Slack 알림 전송 실패:', err);
  }
}
