import axios from 'axios';

/**
 * 서비스 장애 및 주요 이벤트 알림용 Slack Notifier
 */

export async function sendSlackNotification(message: string, data?: any, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'INFO') {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log(`[Slack Mock] ${type}: ${message}`, data || '');
    return;
  }

  const colorMap = {
    SUCCESS: '#36a64f',
    ERROR: '#ff0000',
    INFO: '#439FE0'
  };

  try {
    const isError = !!(data?.error || (data?.failed && data.failed > 0));
    const statusEmoji = isError ? '🔴' : '🟢';
    
    const payload = {
      text: type === 'SUCCESS' ? `✅ *[동플 허브] 작업 성공: ${message}*` : type === 'ERROR' ? `🚨 *[동플 허브] 장애 발생: ${message}*` : `ℹ️ *[동플 허브] 정보 알림: ${message}*`,
      attachments: [
        {
          color: isError ? '#ff0000' : colorMap[type],
          fields: [
            { title: '상태', value: message, short: true },
            { title: '시간', value: new Date().toLocaleString('ko-KR'), short: true },
            { 
              title: '통계/상세', 
              value: data?.total ? `총: ${data.total} / 성공: ${data.success || 0} / 실패: ${data.failed || 0}` : (data ? JSON.stringify(data).substring(0, 1000) : '해당 없음'), 
              short: false 
            },
            { 
              title: '오류 내역', 
              value: data?.error || data?.details || '없음', 
              short: false 
            }
          ],
          footer: 'Dongple Hub Automation',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    await axios.post(webhookUrl, payload);
  } catch (err) {
    console.error('Slack 알림 전송 실패:', err);
  }
}
